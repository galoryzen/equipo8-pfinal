"""HTTP tests for /manager/* catalog routes."""

from datetime import date
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.adapters.inbound.api.dependencies import get_manager_hotel_id
from app.application.exceptions import PromotionError
from app.main import app


def _with_manager_hotel(client, fn):
    app.dependency_overrides[get_manager_hotel_id] = lambda: uuid4()
    try:
        return fn()
    finally:
        app.dependency_overrides.pop(get_manager_hotel_id, None)


class TestManagerHotelsEndpoints:
    @patch("app.adapters.inbound.api.manager.get_list_manager_hotels_use_case")
    def test_list_manager_hotels_ok(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "items": [
                {
                    "id": str(uuid4()),
                    "name": "Prop",
                    "location": "X, Y",
                    "totalRooms": 1,
                    "occupiedRooms": 0,
                    "status": "ACTIVE",
                    "imageUrl": None,
                    "categories": 0,
                }
            ],
            "total": 1,
            "page": 1,
            "page_size": 10,
            "total_pages": 1,
            "message": None,
        }
        mock_factory.return_value = mock_uc

        def call():
            return client.get("/api/v1/catalog/manager/hotels")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Prop"

    def test_list_manager_hotels_401_without_hotel_claim(self, client):
        resp = client.get("/api/v1/catalog/manager/hotels")
        assert resp.status_code == 401

    def test_list_manager_hotels_401_invalid_bearer(self, client):
        resp = client.get(
            "/api/v1/catalog/manager/hotels",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
        assert resp.status_code == 401

    def test_list_manager_hotels_page_below_min_422(self, client):
        def call():
            return client.get("/api/v1/catalog/manager/hotels?page=0")

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 422

    def test_list_manager_hotels_page_size_above_max_422(self, client):
        def call():
            return client.get("/api/v1/catalog/manager/hotels?page_size=101")

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.manager.get_list_manager_hotels_use_case")
    def test_list_manager_hotels_forwards_query_params(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "items": [],
            "total": 0,
            "page": 3,
            "page_size": 25,
            "total_pages": 0,
            "message": None,
        }
        mock_factory.return_value = mock_uc

        def call():
            return client.get("/api/v1/catalog/manager/hotels?page=3&page_size=25")

        _with_manager_hotel(client, call)

        mock_uc.execute.assert_awaited_once()
        kwargs = mock_uc.execute.await_args.kwargs
        assert kwargs["page"] == 3
        assert kwargs["page_size"] == 25


class TestManagerMetricsEndpoint:
    @patch("app.adapters.inbound.api.manager.get_booking_property_stats", new_callable=AsyncMock)
    @patch("app.adapters.inbound.api.manager.get_hotel_metrics_use_case")
    def test_metrics_merges_booking_service_stats(self, mock_metrics_factory, mock_booking_stats, client):
        mock_booking_stats.return_value = {"active_bookings": 2, "monthly_revenue": 99.5}
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "occupancyRate": 25.0,
            "activeBookings": 2,
            "monthlyRevenue": 99.5,
        }
        mock_metrics_factory.return_value = mock_uc

        def call():
            return client.get(f"/api/v1/catalog/manager/hotels/{uuid4()}/metrics")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["activeBookings"] == 2
        mock_booking_stats.assert_awaited_once()

    def test_metrics_401_without_auth(self, client):
        resp = client.get(f"/api/v1/catalog/manager/hotels/{uuid4()}/metrics")
        assert resp.status_code == 401


class TestManagerRoomTypesEndpoint:
    @patch("app.adapters.inbound.api.manager.get_list_room_types_availability_use_case")
    def test_room_types_paginated(self, mock_factory, client):
        rt_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "items": [
                {
                    "id": str(rt_id),
                    "name": "Standard",
                    "icon": "standard",
                    "available": 1,
                    "total": 3,
                    "rate_plan_id": str(uuid4()),
                }
            ],
            "total": 1,
            "page": 1,
            "page_size": 10,
            "total_pages": 1,
            "message": None,
        }
        mock_factory.return_value = mock_uc
        prop_id = uuid4()

        def call():
            return client.get(f"/api/v1/catalog/manager/hotels/{prop_id}/room-types?page=1&page_size=10")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["items"][0]["icon"] == "standard"

    def test_room_types_page_invalid_422(self, client):
        prop_id = uuid4()

        def call():
            return client.get(f"/api/v1/catalog/manager/hotels/{prop_id}/room-types?page=0")

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 422


class TestManagerPromotionsEndpoints:
    @patch("app.adapters.inbound.api.manager.get_create_promotion_use_case")
    def test_create_promotion_201(self, mock_factory, client):
        promo_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "id": promo_id,
            "name": "Promo",
            "discount_type": "PERCENT",
            "discount_value": "10",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 4, 30),
            "is_active": True,
        }
        mock_factory.return_value = mock_uc
        prop_id = uuid4()

        def call():
            return client.post(
                f"/api/v1/catalog/manager/hotels/{prop_id}/promotions",
                json={
                    "rate_plan_id": str(uuid4()),
                    "name": "Promo",
                    "discount_type": "PERCENT",
                    "discount_value": "10",
                    "start_date": "2026-04-01",
                    "end_date": "2026-04-30",
                },
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 201
        assert resp.json()["name"] == "Promo"

    @patch("app.adapters.inbound.api.manager.get_create_promotion_use_case")
    def test_create_promotion_422_on_use_case_error(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PromotionError("rate_plan not found for this property")
        mock_factory.return_value = mock_uc
        prop_id = uuid4()

        def call():
            return client.post(
                f"/api/v1/catalog/manager/hotels/{prop_id}/promotions",
                json={
                    "rate_plan_id": str(uuid4()),
                    "name": "Bad",
                    "discount_type": "PERCENT",
                    "discount_value": "5",
                    "start_date": "2026-04-01",
                    "end_date": "2026-04-30",
                },
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 422
        assert resp.json()["code"] == "PROMOTION_ERROR"

    def test_create_promotion_422_on_invalid_request_body(self, client):
        prop_id = uuid4()

        def call():
            return client.post(
                f"/api/v1/catalog/manager/hotels/{prop_id}/promotions",
                json={"name": "incomplete"},
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.manager.get_room_type_promotion_use_case")
    def test_get_room_type_promotion(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "id": uuid4(),
            "rate_plan_id": uuid4(),
            "name": "P",
            "discount_type": "FIXED",
            "discount_value": "20",
            "start_date": date(2026, 1, 1),
            "end_date": date(2026, 1, 2),
            "is_active": True,
        }
        mock_factory.return_value = mock_uc
        rt_id = uuid4()

        def call():
            return client.get(f"/api/v1/catalog/manager/room-types/{rt_id}/promotion")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["discount_type"] == "FIXED"

    @patch("app.adapters.inbound.api.manager.get_room_type_promotion_use_case")
    def test_get_room_type_promotion_null_when_absent(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc
        rt_id = uuid4()

        def call():
            return client.get(f"/api/v1/catalog/manager/room-types/{rt_id}/promotion")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json() is None

    @patch("app.adapters.inbound.api.manager.get_delete_promotion_use_case")
    def test_delete_promotion_204(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc

        def call():
            return client.delete(f"/api/v1/catalog/manager/promotions/{uuid4()}")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 204


class TestManagerCancellationPolicyEndpoints:
    @patch("app.adapters.inbound.api.manager.get_rate_plan_cancellation_policy_use_case")
    def test_get_cancellation_policy(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {"type": "NON_REFUNDABLE", "refund_percent": None, "hours_limit": None}
        mock_factory.return_value = mock_uc

        def call():
            return client.get(f"/api/v1/catalog/manager/rate-plans/{uuid4()}/cancellation-policy")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["type"] == "NON_REFUNDABLE"

    @patch("app.adapters.inbound.api.manager.get_rate_plan_cancellation_policy_use_case")
    def test_get_cancellation_policy_null_when_absent(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc

        def call():
            return client.get(f"/api/v1/catalog/manager/rate-plans/{uuid4()}/cancellation-policy")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json() is None

    @patch("app.adapters.inbound.api.manager.get_update_cancellation_policy_use_case")
    def test_patch_cancellation_policy(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {"type": "FULL", "refund_percent": None, "hours_limit": None}
        mock_factory.return_value = mock_uc

        def call():
            return client.patch(
                f"/api/v1/catalog/manager/rate-plans/{uuid4()}/cancellation-policy",
                json={"type": "FULL"},
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["type"] == "FULL"

    def test_patch_cancellation_policy_invalid_type_422(self, client):
        def call():
            return client.patch(
                f"/api/v1/catalog/manager/rate-plans/{uuid4()}/cancellation-policy",
                json={"type": "NOT_A_POLICY"},
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 422
