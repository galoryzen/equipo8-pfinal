"""HTTP tests for /admin/properties/{property_id}/... catalog routes."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.adapters.inbound.api.dependencies import resolve_admin_property_hotel_id
from app.main import app


def sample_profile_payload():
    pid = uuid4()
    return {
        "id": str(pid),
        "name": "Hotel",
        "description": "d",
        "city": "C",
        "country": "X",
        "amenity_codes": [],
        "policy": "p",
        "images": [],
    }


class TestAdminPropertyProfileEndpoints:
    @patch("app.adapters.inbound.api.admin.get_hotel_profile_use_case")
    def test_admin_get_profile_calls_use_case(self, mock_factory, client):
        fake_hotel_id = uuid4()
        payload = sample_profile_payload()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = payload
        mock_factory.return_value = mock_uc

        app.dependency_overrides[resolve_admin_property_hotel_id] = lambda: fake_hotel_id
        try:
            prop_id = uuid4()
            resp = client.get(f"/api/v1/catalog/admin/properties/{prop_id}/profile")
            assert resp.status_code == 200
            mock_uc.execute.assert_awaited_once_with(
                property_id=prop_id,
                hotel_id=fake_hotel_id,
            )
            assert resp.json()["name"] == "Hotel"
        finally:
            app.dependency_overrides.pop(resolve_admin_property_hotel_id, None)

    def test_admin_get_profile_unauthenticated_returns_401(self, client):
        resp = client.get(f"/api/v1/catalog/admin/properties/{uuid4()}/profile")
        assert resp.status_code == 401

    @patch("app.adapters.inbound.api.admin.get_update_hotel_profile_use_case")
    def test_admin_patch_profile_calls_use_case(self, mock_factory, client):
        fake_hotel_id = uuid4()
        payload = sample_profile_payload()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = payload
        mock_factory.return_value = mock_uc

        app.dependency_overrides[resolve_admin_property_hotel_id] = lambda: fake_hotel_id
        try:
            prop_id = uuid4()
            resp = client.patch(
                f"/api/v1/catalog/admin/properties/{prop_id}/profile",
                json={"description": "new"},
            )
            assert resp.status_code == 200
            mock_uc.execute.assert_awaited_once()
            kw = mock_uc.execute.await_args.kwargs
            assert kw["property_id"] == prop_id
            assert kw["hotel_id"] == fake_hotel_id
            assert kw["data"].description == "new"
        finally:
            app.dependency_overrides.pop(resolve_admin_property_hotel_id, None)
