import uuid
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from contracts.events.base import DomainEventEnvelope
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt as jose_jwt
from shared.events.logging import LoggingDomainEventPublisher

from app.adapters.inbound.api import dependencies as deps
from app.adapters.inbound.api import health as health_mod
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.outbound.http.booking_http_client import HttpBookingServiceClient
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.application.exceptions import (
    BookingNotFoundError,
    BookingNotPayableError,
    BookingSnapshotError,
    InvalidTokenError,
    PaymentIntentNotFoundError,
)
from app.application.ports.outbound.token_port import TokenPort
from app.config import settings


def test_register_error_handlers_all_branches():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    async def boom(kind: str):
        match kind:
            case "invalid_token":
                raise InvalidTokenError("bad token")
            case "booking_not_found":
                raise BookingNotFoundError()
            case "booking_snapshot":
                raise BookingSnapshotError("snap")
            case "booking_not_payable":
                raise BookingNotPayableError("np")
            case "intent_not_found":
                raise PaymentIntentNotFoundError()
            case _:
                raise AssertionError("unknown kind")

    client = TestClient(app)
    cases = [
        ("invalid_token", 401, "INVALID_TOKEN"),
        ("booking_not_found", 404, "BOOKING_NOT_FOUND"),
        ("booking_snapshot", 503, "BOOKING_UNAVAILABLE"),
        ("booking_not_payable", 409, "BOOKING_NOT_PAYABLE"),
        ("intent_not_found", 404, "PAYMENT_INTENT_NOT_FOUND"),
    ]
    for kind, status, code in cases:
        r = client.get("/boom", params={"kind": kind}, headers={"x-request-id": "trace-1"})
        assert r.status_code == status, kind
        body = r.json()
        assert body["code"] == code
        assert body["trace_id"] == "trace-1"


def test_jwt_adapter_decodes_valid_token():
    uid = uuid.uuid4()
    raw = jose_jwt.encode(
        {"sub": str(uid)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    adapter = JwtTokenAdapter()
    payload = adapter.decode_access_token(raw)
    assert payload is not None
    assert payload["sub"] == str(uid)


def test_jwt_adapter_invalid_token_returns_none():
    adapter = JwtTokenAdapter()
    assert adapter.decode_access_token("not.valid.jwt") is None


def test_get_authorization_header_requires_value():
    with pytest.raises(InvalidTokenError):
        deps.get_authorization_header(None)


def test_get_authorization_header_passes_through():
    assert deps.get_authorization_header("Bearer abc") == "Bearer abc"


def test_get_current_user_id_happy_path():
    uid = uuid.uuid4()
    port = MagicMock(spec=TokenPort)
    port.decode_access_token.return_value = {"sub": str(uid)}
    out = deps.get_current_user_id(authorization="Bearer secret", token_adapter=port)
    assert out == uid


def test_get_current_user_id_not_bearer():
    port = MagicMock(spec=TokenPort)
    with pytest.raises(InvalidTokenError):
        deps.get_current_user_id(authorization="Token x", token_adapter=port)


def test_get_current_user_id_bad_decode():
    port = MagicMock(spec=TokenPort)
    port.decode_access_token.return_value = None
    with pytest.raises(InvalidTokenError, match="Invalid or expired"):
        deps.get_current_user_id(authorization="Bearer x", token_adapter=port)


def test_get_current_user_id_missing_sub():
    port = MagicMock(spec=TokenPort)
    port.decode_access_token.return_value = {"role": "x"}
    with pytest.raises(InvalidTokenError, match="payload"):
        deps.get_current_user_id(authorization="Bearer x", token_adapter=port)


def test_get_current_user_id_invalid_sub_uuid():
    port = MagicMock(spec=TokenPort)
    port.decode_access_token.return_value = {"sub": "not-a-uuid"}
    with pytest.raises(InvalidTokenError, match="subject"):
        deps.get_current_user_id(authorization="Bearer x", token_adapter=port)


def test_get_booking_service_client_with_injected_async_client():
    mock_client = MagicMock(spec=httpx.AsyncClient)
    deps.set_payment_http_client(mock_client)
    try:
        svc = deps.get_booking_service_client()
        assert isinstance(svc, HttpBookingServiceClient)
    finally:
        deps.set_payment_http_client(None)


def test_get_token_and_event_publishers():
    assert isinstance(deps.get_token_adapter(), JwtTokenAdapter)
    a = deps.get_event_publisher()
    b = deps.get_event_publisher()
    assert a is b


@pytest.mark.asyncio
async def test_logging_event_publisher_invokes_logger(caplog):
    caplog.set_level("INFO")
    pub = LoggingDomainEventPublisher()
    await pub.publish(DomainEventEnvelope(event_type="TEST_EVT", payload={"k": "v"}))
    assert any("TEST_EVT" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_health_db_ok(monkeypatch):
    monkeypatch.setattr(health_mod, "check_db", AsyncMock())

    app = FastAPI()
    app.include_router(health_mod.router, prefix="/api")
    client = TestClient(app)
    r = client.get("/api/health/db")
    assert r.status_code == 200
    assert r.json()["database"] == "connected"


@pytest.mark.asyncio
async def test_health_db_error(monkeypatch):
    async def boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(health_mod, "check_db", boom)

    app = FastAPI()
    app.include_router(health_mod.router, prefix="/api")
    client = TestClient(app)
    r = client.get("/api/health/db")
    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "error"
    assert "db down" in body["detail"]
