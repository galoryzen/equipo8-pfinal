from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import get_cache, get_db_session
from app.application.ports.outbound.cache_port import CachePort
from app.main import app

# ── Fixtures ─────────────────────────────────────────────


@pytest.fixture
def mock_cache():
    cache = AsyncMock(spec=CachePort)
    cache.get.return_value = None
    cache.set.return_value = None
    return cache


@pytest.fixture
def mock_session():
    return AsyncMock()


CANCUN_CITY_ID = UUID("bbbe56fe-8f4b-4498-a876-396a342d3615")
CANCUN_PROPERTY_ID = UUID("30000000-0000-0000-0000-000000000001")


def make_property_summary(
    id=CANCUN_PROPERTY_ID,
    name="Sol Caribe Cancún",
    city_name="CANCÚN",
    country="MÉXICO",
    rating=Decimal("4.60"),
    min_price=Decimal("120.00"),
):
    return {
        "id": id,
        "name": name,
        "city": {
            "id": CANCUN_CITY_ID,
            "name": city_name,
            "department": "QUINTANA ROO",
            "country": country,
        },
        "address": "Blvd. Kukulcán Km 12.5",
        "rating_avg": rating,
        "review_count": 124,
        "image": {"url": "https://example.com/img.jpg", "caption": "Fachada"},
        "min_price": min_price,
        "amenities": [{"code": "wifi", "name": "Wi-Fi gratuito"}],
    }


@pytest.fixture
def client(mock_cache):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_cache] = lambda: mock_cache
    app.dependency_overrides[get_db_session] = override_session
    yield TestClient(app)
    app.dependency_overrides.clear()
