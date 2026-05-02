"""Shared fixtures for the integration suite.

These tests run against the live local docker-compose stack: nginx gateway,
auth/catalog/booking/payment/notification services, Postgres, RabbitMQ.

Prerequisites before invoking pytest:
    cd backend
    make reset-db && make up
    # wait until `docker compose ps` shows all containers as `healthy`

Environment overrides (rarely needed):
    THUB_GATEWAY_URL  default http://localhost:8080
    THUB_DB_DSN       default postgres://travelhub:travelhub_dev@localhost:5432/travelhub
"""

from __future__ import annotations

import os
import sys
from collections.abc import AsyncGenerator, Callable
from datetime import date, timedelta
from pathlib import Path

import asyncpg
import httpx
import pytest
import pytest_asyncio

# Make `helpers` importable as a top-level absolute import from any test file.
sys.path.insert(0, str(Path(__file__).resolve().parent))


# ── Seed identifiers from backend/db/03-seed.sql ────────────────────────
# Sol Caribe Cancún → Estándar Vista al Mar → Tarifa Base ($120/night)
SEEDED_PROPERTY_ID = "30000000-0000-0000-0000-000000000001"
SEEDED_ROOM_TYPE_ID = "60000000-0000-0000-0000-000000000001"
SEEDED_RATE_PLAN_ID = "70000000-0000-0000-0000-000000000001"

TRAVELER_EMAIL = "carlos@example.com"
HOTEL_MANAGER_EMAIL = "roberto@cadenadelsol.com"
ADMIN_EMAIL = "admin@travelhub.com"
SEED_PASSWORD = "travelhub"

# Header value for the partner-admin endpoint (docker-compose env var
# AUTH_PARTNER_ADMIN_SECRET). Used by the role-check test.
PARTNER_ADMIN_SECRET = os.getenv("THUB_PARTNER_ADMIN_SECRET", "dev-partner-admin-secret")


@pytest.fixture(scope="session")
def partner_admin_secret() -> str:
    return PARTNER_ADMIN_SECRET


@pytest.fixture(scope="session")
def traveler_email() -> str:
    return TRAVELER_EMAIL


@pytest.fixture(scope="session")
def seed_password() -> str:
    return SEED_PASSWORD


def pytest_collection_modifyitems(config, items):
    """Auto-mark every test in this directory as `integration`."""
    for item in items:
        item.add_marker("integration")


# ── Session config ───────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def gateway_url() -> str:
    return os.getenv("THUB_GATEWAY_URL", "http://localhost:8080")


@pytest.fixture(scope="session")
def db_dsn() -> str:
    return os.getenv(
        "THUB_DB_DSN",
        "postgres://travelhub:travelhub_dev@localhost:5432/travelhub",
    )


# ── DB pool ──────────────────────────────────────────────────────────────


@pytest_asyncio.fixture(scope="session")
async def db_pool(db_dsn: str) -> AsyncGenerator[asyncpg.Pool, None]:
    pool = await asyncpg.create_pool(dsn=db_dsn, min_size=1, max_size=4)
    try:
        yield pool
    finally:
        await pool.close()


# ── HTTP client ──────────────────────────────────────────────────────────


@pytest_asyncio.fixture(scope="session")
async def http_client(gateway_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(
        base_url=gateway_url,
        timeout=httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0),
    ) as client:
        yield client


# ── Auth tokens ──────────────────────────────────────────────────────────


async def _login(client: httpx.AsyncClient, email: str, password: str) -> str:
    """Hit POST /api/v1/auth/login and return the bearer token from the body."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    if resp.status_code != 200:
        pytest.skip(
            f"login failed for {email}: HTTP {resp.status_code} body={resp.text!r}. "
            "Is the stack up and seeded? Run `make reset-db && make up` from backend/."
        )
    body = resp.json()
    token = body.get("token")
    assert token, f"login response missing 'token': {body!r}"
    return token


@pytest_asyncio.fixture(scope="session")
async def traveler_token(http_client: httpx.AsyncClient) -> str:
    return await _login(http_client, TRAVELER_EMAIL, SEED_PASSWORD)


@pytest_asyncio.fixture(scope="session")
async def hotel_manager_token(http_client: httpx.AsyncClient) -> str:
    return await _login(http_client, HOTEL_MANAGER_EMAIL, SEED_PASSWORD)


@pytest_asyncio.fixture(scope="session")
async def admin_token(http_client: httpx.AsyncClient) -> str:
    return await _login(http_client, ADMIN_EMAIL, SEED_PASSWORD)


@pytest.fixture
def auth_header() -> Callable[[str], dict[str, str]]:
    def _make(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    return _make


# ── Seeded catalog: validate the seed is fresh ───────────────────────────
#
# The seed at backend/db/03-seed.sql populates rate_calendar/inventory_calendar
# from CURRENT_DATE for 30 days. If the DB was seeded long ago, no rates exist
# for "today + N days" and booking creation will fail with a confusing error.
# This fixture validates by hitting the property detail endpoint and skips the
# whole suite with a clear message if the property is missing.


@pytest_asyncio.fixture(scope="session")
async def seeded_property_id(http_client: httpx.AsyncClient) -> str:
    resp = await http_client.get(f"/api/v1/catalog/properties/{SEEDED_PROPERTY_ID}")
    if resp.status_code != 200:
        pytest.skip(
            f"seeded property {SEEDED_PROPERTY_ID} not reachable "
            f"(HTTP {resp.status_code}). Run `make reset-db && make up` from backend/."
        )
    return SEEDED_PROPERTY_ID


@pytest.fixture(scope="session")
def seeded_room_type_id() -> str:
    return SEEDED_ROOM_TYPE_ID


@pytest.fixture(scope="session")
def seeded_rate_plan_id() -> str:
    return SEEDED_RATE_PLAN_ID


@pytest.fixture
def booking_dates() -> tuple[date, date]:
    """Return (checkin, checkout) two days starting 7 days from today.

    Stays within the seed's 30-day rate_calendar window if the DB was seeded
    within the last ~3 weeks.
    """
    checkin = date.today() + timedelta(days=7)
    checkout = checkin + timedelta(days=2)
    return checkin, checkout


# ── Cleanup of bookings created during a test ────────────────────────────


@pytest_asyncio.fixture
async def created_booking_ids(
    db_pool: asyncpg.Pool,
) -> AsyncGenerator[list[str], None]:
    """Collector for booking ids created in a test.

    On teardown, deletes related rows in payments / booking history / guests
    / inventory holds / notifications, then deletes the bookings themselves.
    Cascade is partial in the schema, so we explicit-delete the parents.
    """
    ids: list[str] = []
    yield ids
    if not ids:
        return
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            # Restore catalog.inventory_calendar for bookings that still hold
            # inventory (inventory_released = FALSE). Each booking holds 1 unit
            # per night across [checkin, checkout). The cancel/expire flow
            # normally does this; tests bypass it for CONFIRMED/PENDING_*
            # bookings, so we restore manually.
            await conn.execute(
                """
                update catalog.inventory_calendar ic
                   set available_units = ic.available_units + 1
                  from booking.booking b
                 where b.id = any($1::uuid[])
                   and b.inventory_released = false
                   and ic.room_type_id = b.room_type_id
                   and ic.day >= b.checkin
                   and ic.day <  b.checkout
                """,
                ids,
            )
            await conn.execute(
                "delete from notifications.notification where booking_id = any($1::uuid[])",
                ids,
            )
            await conn.execute(
                "delete from payments.refund where payment_id in "
                "(select id from payments.payment where booking_id = any($1::uuid[]))",
                ids,
            )
            await conn.execute(
                "delete from payments.webhook_event where payment_intent_id in "
                "(select id from payments.payment_intent where booking_id = any($1::uuid[]))",
                ids,
            )
            await conn.execute(
                "delete from payments.payment_attempt where payment_intent_id in "
                "(select id from payments.payment_intent where booking_id = any($1::uuid[]))",
                ids,
            )
            await conn.execute(
                "update booking.booking set confirmation_payment_intent_id = null "
                "where id = any($1::uuid[])",
                ids,
            )
            await conn.execute(
                "delete from payments.payment_intent where booking_id = any($1::uuid[])",
                ids,
            )
            await conn.execute(
                "delete from payments.payment where booking_id = any($1::uuid[])",
                ids,
            )
            await conn.execute(
                "delete from booking.booking_status_history "
                "where booking_id = any($1::uuid[])",
                ids,
            )
            # booking.guest has ON DELETE CASCADE on booking_id, but be explicit
            await conn.execute(
                "delete from booking.guest where booking_id = any($1::uuid[])",
                ids,
            )
            await conn.execute(
                "delete from booking.booking where id = any($1::uuid[])",
                ids,
            )
