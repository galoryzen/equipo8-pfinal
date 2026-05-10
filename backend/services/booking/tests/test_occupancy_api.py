"""HTTP wiring tests for occupancy endpoints (dependency overrides)."""

from unittest.mock import AsyncMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import (
    get_current_user_info,
    get_occupancy_calendar_use_case,
    get_occupancy_daily_breakdown_use_case,
    get_occupancy_projection_use_case,
)
from app.main import app

HOTEL_ID = UUID("e0000000-0000-0000-0000-000000000001")
PROP = UUID("30000000-0000-0000-0000-000000000001")


def test_traveler_forbidden_calendar():
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "TRAVELER",
        "user_id": "a0000000-0000-0000-0000-000000000001",
        "hotel_id": None,
    }
    mock_uc = AsyncMock()
    app.dependency_overrides[get_occupancy_calendar_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/booking/occupancy/calendar",
                params={"date_from": "2026-06-01", "date_to": "2026-06-07"},
            )
        assert r.status_code == 403
        mock_uc.execute.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_calendar_ok_hotel_partner():
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "property_id": str(PROP),
        "date_from": "2026-06-01",
        "date_to": "2026-06-03",
        "days": [
            {
                "date": "2026-06-01",
                "total_rooms": 10,
                "occupied_rooms": 9,
                "blocked_rooms": 0,
                "available_rooms": 1,
                "occupancy_rate": 90.0,
                "occupancy_level": "HIGH",
            }
        ],
    }
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    app.dependency_overrides[get_occupancy_calendar_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/booking/occupancy/calendar",
                params={"date_from": "2026-06-01", "date_to": "2026-06-03"},
            )
        assert r.status_code == 200
        assert r.json()["days"][0]["occupancy_level"] == "HIGH"
        mock_uc.execute.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_calendar_permission_error_maps_403():
    mock_uc = AsyncMock()
    mock_uc.execute.side_effect = PermissionError("No autorizado para consultar esta propiedad")
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "MANAGER",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    app.dependency_overrides[get_occupancy_calendar_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/booking/occupancy/calendar",
                params={
                    "date_from": "2026-06-01",
                    "date_to": "2026-06-03",
                    "property_id": "30000000-0000-0000-0000-000000000003",
                },
            )
        assert r.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_calendar_validation_error_maps_400():
    mock_uc = AsyncMock()
    mock_uc.execute.side_effect = ValueError("El rango máximo permitido es 90 días")
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    app.dependency_overrides[get_occupancy_calendar_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/booking/occupancy/calendar",
                params={"date_from": "2026-06-01", "date_to": "2026-09-01"},
            )
        assert r.status_code == 400
    finally:
        app.dependency_overrides.clear()


def test_projection_ok():
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "property_id": str(PROP),
        "date_from": "2026-06-01",
        "date_to": "2026-06-03",
        "days": [],
        "alerts": [],
    }
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    app.dependency_overrides[get_occupancy_projection_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get("/api/v1/booking/occupancy/projection", params={"days": 90})
        assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_daily_breakdown_ok():
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "property_id": str(PROP),
        "date": "2026-06-15",
        "room_types": [],
    }
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    app.dependency_overrides[get_occupancy_daily_breakdown_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/booking/occupancy/daily-breakdown",
                params={"property_id": str(PROP), "date": "2026-06-15"},
            )
        assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_hotel_missing_hotel_id_400():
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
        "hotel_id": None,
    }
    mock_uc = AsyncMock()
    app.dependency_overrides[get_occupancy_projection_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get("/api/v1/booking/occupancy/projection")
        assert r.status_code == 400
        mock_uc.execute.assert_not_called()
    finally:
        app.dependency_overrides.clear()
