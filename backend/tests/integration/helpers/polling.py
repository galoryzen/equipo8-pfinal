"""Polling helpers for cross-service async assertions.

The local stack uses RabbitMQ; a successful round-trip is sub-second, so the
default timeout has plenty of headroom for cold consumer starts.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

import asyncpg
import httpx


async def wait_for_booking_status(
    http_client: httpx.AsyncClient,
    headers: dict[str, str],
    booking_id: str,
    expected: set[str],
    timeout: float = 20.0,
    interval: float = 0.5,
) -> dict[str, Any]:
    """Poll GET /api/v1/booking/bookings/{id} until status is in `expected`.

    Returns the booking JSON when matched. Raises AssertionError on timeout
    with the most recently observed status for diagnostics.
    """
    deadline = time.monotonic() + timeout
    last_status = "<never observed>"
    last_body: Any = None
    while time.monotonic() < deadline:
        resp = await http_client.get(
            f"/api/v1/booking/bookings/{booking_id}", headers=headers
        )
        if resp.status_code == 200:
            body = resp.json()
            last_status = body.get("status", "<missing>")
            last_body = body
            if last_status in expected:
                return body
        await asyncio.sleep(interval)
    raise AssertionError(
        f"booking {booking_id} did not reach {expected} within {timeout}s "
        f"(last status={last_status!r}, last_body={last_body!r})"
    )


async def wait_for_db_row(
    pool: asyncpg.Pool,
    query: str,
    *params: Any,
    timeout: float = 15.0,
    interval: float = 0.5,
) -> asyncpg.Record:
    """Poll a SELECT until it returns a row. Raise AssertionError on timeout."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, *params)
            if row is not None:
                return row
        await asyncio.sleep(interval)
    raise AssertionError(
        f"no row matched within {timeout}s for query: {query!r} params={params!r}"
    )


async def poll_until(
    predicate: Callable[[], Awaitable[bool]],
    timeout: float = 10.0,
    interval: float = 0.5,
    description: str = "predicate",
) -> None:
    """Generic awaitable polling for tests that need a custom assertion."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if await predicate():
            return
        await asyncio.sleep(interval)
    raise AssertionError(f"{description} did not become true within {timeout}s")
