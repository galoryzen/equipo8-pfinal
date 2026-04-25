from unittest.mock import AsyncMock

from app.adapters.inbound.api.dependencies import get_hotel_revenue_report_use_case
from app.main import app


def test_revenue_report_forbidden_for_traveler(client_authenticated):
    resp = client_authenticated.get(
        "/api/v1/booking/dashboard/revenue-report",
        params={
            "hotel_id": "c0000000-0000-0000-0000-000000000001",
            "from": "2026-01-01",
            "to": "2026-01-31",
        },
    )
    assert resp.status_code == 403


def test_revenue_report_ok_for_hotel_partner():
    from fastapi.testclient import TestClient

    from app.adapters.inbound.api.dependencies import get_current_user_info

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "kpis": {
            "totalRevenue": {"value": 124530.0, "variation": 12.5},
            "adr": {"value": 345.0, "variation": 4.2},
            "occupancyRate": {"value": 82.4, "variation": -1.8},
        },
        "trends": [{"date": "2026-10-01", "revenue": 4500.0, "occupancyRate": 78.0}],
        "revenueByRoomType": [
            {
                "roomType": "Deluxe Suite",
                "unitsSold": 145,
                "avgRate": 320.0,
                "totalRevenue": 46400.0,
            }
        ],
        "totalAggregatedRevenue": 46400.0,
        "metadata": {"from": "2026-10-01", "to": "2026-10-31", "currency": "USD"},
    }

    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
    }
    app.dependency_overrides[get_hotel_revenue_report_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/booking/dashboard/revenue-report",
                params={
                    "hotel_id": "c0000000-0000-0000-0000-000000000001",
                    "from": "2026-10-01",
                    "to": "2026-10-31",
                },
            )
        assert response.status_code == 200
        body = response.json()
        assert body["kpis"]["totalRevenue"]["value"] == 124530.0
        assert body["kpis"]["occupancyRate"]["variation"] == -1.8
        assert body["trends"][0]["occupancyRate"] == 78.0
        assert body["revenueByRoomType"][0]["roomType"] == "Deluxe Suite"
        assert body["totalAggregatedRevenue"] == 46400.0
        assert body["metadata"]["currency"] == "USD"
    finally:
        app.dependency_overrides.clear()
