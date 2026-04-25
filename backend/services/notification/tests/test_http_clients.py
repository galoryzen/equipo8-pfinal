from uuid import uuid4

import httpx
import pytest
import respx

from app.adapters.outbound.http.auth_client import HttpAuthClient
from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.application.exceptions import NotificationEnrichmentError

AUTH_URL = "http://auth.test"
CATALOG_URL = "http://catalog.test"
TOKEN = "internal-token-xyz"


@pytest.fixture
async def httpx_client():
    async with httpx.AsyncClient() as client:
        yield client


# --- auth_client ---


@pytest.mark.asyncio
async def test_auth_client_returns_contact_on_200(httpx_client):
    user_id = uuid4()
    payload = {
        "id": str(user_id),
        "full_name": "Ana Pérez",
        "email": "ana@test.com",
    }
    async with respx.mock(base_url=AUTH_URL) as mock:
        route = mock.get(f"/internal/users/{user_id}/contact").respond(200, json=payload)
        client = HttpAuthClient(httpx_client, AUTH_URL, TOKEN)
        contact = await client.get_contact(user_id)

        assert contact.id == user_id
        assert contact.full_name == "Ana Pérez"
        assert contact.email == "ana@test.com"
        assert route.called
        assert route.calls.last.request.headers["x-internal-token"] == TOKEN


@pytest.mark.asyncio
async def test_auth_client_raises_when_404(httpx_client):
    user_id = uuid4()
    async with respx.mock(base_url=AUTH_URL) as mock:
        mock.get(f"/internal/users/{user_id}/contact").respond(404, text="not found")
        client = HttpAuthClient(httpx_client, AUTH_URL, TOKEN)

        with pytest.raises(NotificationEnrichmentError, match="not found"):
            await client.get_contact(user_id)


@pytest.mark.asyncio
async def test_auth_client_raises_on_5xx(httpx_client):
    user_id = uuid4()
    async with respx.mock(base_url=AUTH_URL) as mock:
        mock.get(f"/internal/users/{user_id}/contact").respond(503, text="boom")
        client = HttpAuthClient(httpx_client, AUTH_URL, TOKEN)

        with pytest.raises(NotificationEnrichmentError, match="503"):
            await client.get_contact(user_id)


@pytest.mark.asyncio
async def test_auth_client_raises_on_network_error(httpx_client):
    user_id = uuid4()
    async with respx.mock(base_url=AUTH_URL) as mock:
        mock.get(f"/internal/users/{user_id}/contact").mock(
            side_effect=httpx.ConnectError("refused")
        )
        client = HttpAuthClient(httpx_client, AUTH_URL, TOKEN)

        with pytest.raises(NotificationEnrichmentError, match="unavailable"):
            await client.get_contact(user_id)


# --- catalog_client ---


@pytest.mark.asyncio
async def test_catalog_client_returns_summary_on_200(httpx_client):
    prop_id = uuid4()
    payload = {
        "id": str(prop_id),
        "name": "Hotel Luna",
        "city_name": "Cartagena",
        "country": "Colombia",
        "image_url": "https://cdn.example.com/hero.jpg",
    }
    async with respx.mock(base_url=CATALOG_URL) as mock:
        route = mock.get(f"/internal/properties/{prop_id}/summary").respond(200, json=payload)
        client = HttpCatalogClient(httpx_client, CATALOG_URL, TOKEN)
        summary = await client.get_summary(prop_id)

        assert summary.id == prop_id
        assert summary.name == "Hotel Luna"
        assert summary.image_url == "https://cdn.example.com/hero.jpg"
        assert route.calls.last.request.headers["x-internal-token"] == TOKEN


@pytest.mark.asyncio
async def test_catalog_client_handles_missing_image_url(httpx_client):
    prop_id = uuid4()
    payload = {
        "id": str(prop_id),
        "name": "Hotel Luna",
        "city_name": "Cartagena",
        "country": "Colombia",
        # image_url omitted
    }
    async with respx.mock(base_url=CATALOG_URL) as mock:
        mock.get(f"/internal/properties/{prop_id}/summary").respond(200, json=payload)
        client = HttpCatalogClient(httpx_client, CATALOG_URL, TOKEN)
        summary = await client.get_summary(prop_id)

        assert summary.image_url is None


@pytest.mark.asyncio
async def test_catalog_client_raises_when_404(httpx_client):
    prop_id = uuid4()
    async with respx.mock(base_url=CATALOG_URL) as mock:
        mock.get(f"/internal/properties/{prop_id}/summary").respond(404)
        client = HttpCatalogClient(httpx_client, CATALOG_URL, TOKEN)

        with pytest.raises(NotificationEnrichmentError, match="not found"):
            await client.get_summary(prop_id)


@pytest.mark.asyncio
async def test_catalog_client_raises_on_network_error(httpx_client):
    prop_id = uuid4()
    async with respx.mock(base_url=CATALOG_URL) as mock:
        mock.get(f"/internal/properties/{prop_id}/summary").mock(
            side_effect=httpx.ConnectError("refused")
        )
        client = HttpCatalogClient(httpx_client, CATALOG_URL, TOKEN)

        with pytest.raises(NotificationEnrichmentError, match="unavailable"):
            await client.get_summary(prop_id)
