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


class TestManagerHotelProfileEndpoints:
    def _profile_payload(self, prop_id):
        img_id = uuid4()
        return {
            "id": str(prop_id),
            "name": "Grand Plaza Resort",
            "description": "A nice place.",
            "city": "Miami",
            "country": "USA",
            "amenity_codes": ["WIFI", "POOL"],
            "policy": "Check-in 3pm.",
            "images": [
                {
                    "id": str(img_id),
                    "url": "https://example.com/a.jpg",
                    "caption": None,
                    "display_order": 0,
                }
            ],
        }

    @patch("app.adapters.inbound.api.manager.get_hotel_profile_use_case")
    def test_get_profile_ok(self, mock_factory, client):
        prop_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = self._profile_payload(prop_id)
        mock_factory.return_value = mock_uc

        def call():
            return client.get(f"/api/v1/catalog/manager/hotels/{prop_id}/profile")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Grand Plaza Resort"
        assert body["amenity_codes"] == ["WIFI", "POOL"]
        assert body["images"][0]["display_order"] == 0

    def test_get_profile_401_without_jwt(self, client):
        resp = client.get(f"/api/v1/catalog/manager/hotels/{uuid4()}/profile")
        assert resp.status_code == 401

    @patch("app.adapters.inbound.api.manager.get_hotel_profile_use_case")
    def test_get_profile_404_when_not_owned(self, mock_factory, client):
        from app.application.exceptions import PropertyNotFoundError

        prop_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PropertyNotFoundError(prop_id)
        mock_factory.return_value = mock_uc

        def call():
            return client.get(f"/api/v1/catalog/manager/hotels/{prop_id}/profile")

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 404
        assert resp.json()["code"] == "PROPERTY_NOT_FOUND"

    @patch("app.adapters.inbound.api.manager.get_update_hotel_profile_use_case")
    def test_patch_profile_ok(self, mock_factory, client):
        prop_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = self._profile_payload(prop_id)
        mock_factory.return_value = mock_uc

        def call():
            return client.patch(
                f"/api/v1/catalog/manager/hotels/{prop_id}/profile",
                json={
                    "description": "Updated.",
                    "amenity_codes": ["WIFI", "POOL"],
                    "policy": "Check-in 3pm.",
                },
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        assert resp.json()["name"] == "Grand Plaza Resort"
        mock_uc.execute.assert_awaited_once()

    @patch("app.adapters.inbound.api.manager.get_update_hotel_profile_use_case")
    def test_patch_profile_400_unknown_amenity(self, mock_factory, client):
        from app.application.exceptions import AmenityNotFoundError

        prop_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = AmenityNotFoundError(["BOGUS"])
        mock_factory.return_value = mock_uc

        def call():
            return client.patch(
                f"/api/v1/catalog/manager/hotels/{prop_id}/profile",
                json={"amenity_codes": ["BOGUS"]},
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 400
        body = resp.json()
        assert body["code"] == "AMENITY_NOT_FOUND"
        assert body["codes"] == ["BOGUS"]

    def test_patch_profile_invalid_body_422(self, client):
        def call():
            return client.patch(
                f"/api/v1/catalog/manager/hotels/{uuid4()}/profile",
                json={"amenity_codes": "not-a-list"},
            )

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.manager.get_add_property_image_use_case")
    def test_add_image_201(self, mock_factory, client):
        prop_id = uuid4()
        img_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = {
            "id": str(img_id),
            "url": "https://example.com/x.jpg",
            "caption": None,
            "display_order": 3,
        }
        mock_factory.return_value = mock_uc

        def call():
            return client.post(
                f"/api/v1/catalog/manager/hotels/{prop_id}/images",
                json={"url": "https://example.com/x.jpg"},
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 201
        body = resp.json()
        assert body["url"] == "https://example.com/x.jpg"
        assert body["display_order"] == 3

    def test_add_image_invalid_body_422(self, client):
        def call():
            return client.post(
                f"/api/v1/catalog/manager/hotels/{uuid4()}/images",
                json={"caption": "missing url"},
            )

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.manager.get_delete_property_image_use_case")
    def test_delete_image_204(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc

        def call():
            return client.delete(
                f"/api/v1/catalog/manager/hotels/{uuid4()}/images/{uuid4()}"
            )

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 204

    @patch("app.adapters.inbound.api.manager.get_delete_property_image_use_case")
    def test_delete_image_404_when_image_missing(self, mock_factory, client):
        from app.application.exceptions import PropertyImageNotFoundError

        img_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PropertyImageNotFoundError(img_id)
        mock_factory.return_value = mock_uc

        def call():
            return client.delete(
                f"/api/v1/catalog/manager/hotels/{uuid4()}/images/{img_id}"
            )

        resp = _with_manager_hotel(client, call)
        assert resp.status_code == 404
        assert resp.json()["code"] == "PROPERTY_IMAGE_NOT_FOUND"

    @patch("app.adapters.inbound.api.manager.get_set_primary_property_image_use_case")
    def test_set_primary_image_returns_ordered_list(self, mock_factory, client):
        prop_id = uuid4()
        img_a = uuid4()
        img_b = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            {"id": str(img_b), "url": "https://example.com/b.jpg", "caption": None, "display_order": 0},
            {"id": str(img_a), "url": "https://example.com/a.jpg", "caption": None, "display_order": 1},
        ]
        mock_factory.return_value = mock_uc

        def call():
            return client.patch(
                f"/api/v1/catalog/manager/hotels/{prop_id}/images/{img_b}/primary"
            )

        resp = _with_manager_hotel(client, call)

        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert body[0]["display_order"] == 0
        assert body[0]["id"] == str(img_b)
