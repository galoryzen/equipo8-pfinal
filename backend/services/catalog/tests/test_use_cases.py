"""Unit tests for use cases — mock the ports, test the orchestration."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.exceptions import PropertyNotFoundError
from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.city_repository import CityRepository
from app.application.ports.outbound.property_repository import PropertyRepository
from app.application.use_cases.get_featured_destinations import GetFeaturedDestinationsUseCase
from app.application.use_cases.get_featured_properties import GetFeaturedPropertiesUseCase
from app.application.use_cases.get_property_detail import GetPropertyDetailUseCase
from app.application.use_cases.search_cities import SearchCitiesUseCase
from app.application.use_cases.search_properties import SearchPropertiesUseCase
from app.schemas.city import CityOut, FeaturedDestinationOut
from app.schemas.property import PropertySummary
from tests.conftest import CANCUN_CITY_ID, CANCUN_PROPERTY_ID, make_property_summary


# ── Fixtures ────────────────────────────────────────────


@pytest.fixture
def mock_property_repo():
    return AsyncMock(spec=PropertyRepository)


@pytest.fixture
def mock_city_repo():
    return AsyncMock(spec=CityRepository)


@pytest.fixture
def mock_cache():
    cache = AsyncMock(spec=CachePort)
    cache.get.return_value = None
    return cache


# ── GetFeaturedPropertiesUseCase ────────────────────────


class TestGetFeaturedProperties:
    async def test_maps_dicts_to_property_summaries(self, mock_property_repo):
        """Use case should convert raw dicts from repo into PropertySummary DTOs."""
        mock_property_repo.search_featured.return_value = [
            make_property_summary(),
            make_property_summary(name="Hotel Luna"),
        ]
        uc = GetFeaturedPropertiesUseCase(mock_property_repo)

        result = await uc.execute(limit=5)

        assert len(result) == 2
        assert all(isinstance(r, PropertySummary) for r in result)
        assert result[0].name == "Sol Caribe Cancún"
        assert result[1].name == "Hotel Luna"
        mock_property_repo.search_featured.assert_called_once_with(limit=5)

    async def test_returns_empty_list_when_no_properties(self, mock_property_repo):
        mock_property_repo.search_featured.return_value = []
        uc = GetFeaturedPropertiesUseCase(mock_property_repo)

        result = await uc.execute()

        assert result == []

    async def test_propagates_repo_error(self, mock_property_repo):
        """If the repo fails, the error should bubble up (no silent swallowing)."""
        mock_property_repo.search_featured.side_effect = RuntimeError("db down")
        uc = GetFeaturedPropertiesUseCase(mock_property_repo)

        with pytest.raises(RuntimeError, match="db down"):
            await uc.execute()


# ── GetFeaturedDestinationsUseCase ──────────────────────


def _make_city(name="CANCÚN", department="QUINTANA ROO", country="MÉXICO", image_url="https://example.com/cancun.jpg"):
    city = AsyncMock()
    city.id = CANCUN_CITY_ID
    city.name = name
    city.department = department
    city.country = country
    city.image_url = image_url
    return city


class TestGetFeaturedDestinations:
    async def test_maps_cities_to_dtos(self, mock_city_repo):
        mock_city_repo.get_featured.return_value = [
            _make_city(),
            _make_city(name="BOGOTÁ", department="CUNDINAMARCA", image_url="https://example.com/bogota.jpg"),
        ]
        uc = GetFeaturedDestinationsUseCase(mock_city_repo)

        result = await uc.execute(limit=2)

        assert len(result) == 2
        assert all(isinstance(r, FeaturedDestinationOut) for r in result)
        assert result[0].name == "CANCÚN"
        assert result[1].name == "BOGOTÁ"
        mock_city_repo.get_featured.assert_called_once_with(limit=2)

    async def test_city_without_image(self, mock_city_repo):
        """Cities without image_url should still map correctly."""
        mock_city_repo.get_featured.return_value = [_make_city(image_url=None)]
        uc = GetFeaturedDestinationsUseCase(mock_city_repo)

        result = await uc.execute()

        assert result[0].image_url is None


# ── SearchCitiesUseCase ─────────────────────────────────


class TestSearchCities:
    async def test_maps_cities_to_city_out(self, mock_city_repo):
        mock_city_repo.search.return_value = [_make_city()]
        uc = SearchCitiesUseCase(mock_city_repo)

        result = await uc.execute(q="can")

        assert len(result) == 1
        assert isinstance(result[0], CityOut)
        assert result[0].name == "CANCÚN"
        mock_city_repo.search.assert_called_once_with("can")

    async def test_returns_empty_for_no_match(self, mock_city_repo):
        mock_city_repo.search.return_value = []
        uc = SearchCitiesUseCase(mock_city_repo)

        result = await uc.execute(q="nonexistent")

        assert result == []


# ── GetPropertyDetailUseCase ────────────────────────────


class TestGetPropertyDetail:
    async def test_returns_property_with_reviews(self, mock_property_repo, mock_cache):
        prop_id = CANCUN_PROPERTY_ID
        fake_prop = {"id": prop_id, "name": "Sol Caribe"}
        fake_reviews = [{"rating": 5, "comment": "Great"}]

        mock_property_repo.get_by_id.return_value = fake_prop
        mock_property_repo.get_reviews.return_value = (fake_reviews, 1)
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(property_id=prop_id)

        assert result["property"] == fake_prop
        assert result["reviews"] == fake_reviews
        assert result["review_total"] == 1
        mock_property_repo.get_by_id.assert_called_once_with(prop_id)
        mock_property_repo.get_reviews.assert_called_once_with(prop_id, 1, 10)

    async def test_raises_not_found_when_property_missing(self, mock_property_repo, mock_cache):
        """Must raise PropertyNotFoundError, not return None silently."""
        prop_id = uuid4()
        mock_property_repo.get_by_id.return_value = None
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        with pytest.raises(PropertyNotFoundError):
            await uc.execute(property_id=prop_id)

        # Should NOT call get_reviews if property doesn't exist
        mock_property_repo.get_reviews.assert_not_called()

    async def test_passes_pagination_to_reviews(self, mock_property_repo, mock_cache):
        mock_property_repo.get_by_id.return_value = {"id": CANCUN_PROPERTY_ID}
        mock_property_repo.get_reviews.return_value = ([], 0)
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        await uc.execute(property_id=CANCUN_PROPERTY_ID, review_page=3, review_page_size=5)

        mock_property_repo.get_reviews.assert_called_once_with(CANCUN_PROPERTY_ID, 3, 5)


# ── SearchPropertiesUseCase ─────────────────────────────


class TestSearchProperties:
    async def test_returns_paginated_response(self, mock_property_repo, mock_cache):
        mock_property_repo.search.return_value = (
            [make_property_summary(), make_property_summary(name="Hotel Luna")],
            2,
        )
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
        )

        assert result.total == 2
        assert result.page == 1
        assert result.total_pages == 1
        assert len(result.items) == 2
        assert all(isinstance(i, PropertySummary) for i in result.items)

    async def test_calculates_total_pages(self, mock_property_repo, mock_cache):
        mock_property_repo.search.return_value = (
            [make_property_summary()],
            25,  # 25 results total
        )
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=1,
            page=1,
            page_size=10,
        )

        assert result.total == 25
        assert result.total_pages == 3  # ceil(25/10)

    async def test_passes_all_filters_to_repo(self, mock_property_repo, mock_cache):
        city_id = uuid4()
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=3,
            city_id=city_id,
            min_price=Decimal("50"),
            max_price=Decimal("200"),
            amenity_codes=["wifi", "pool"],
            sort_by="price_asc",
            page=2,
            page_size=15,
        )

        mock_property_repo.search.assert_called_once_with(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=3,
            city_id=city_id,
            min_price=Decimal("50"),
            max_price=Decimal("200"),
            amenity_codes=["wifi", "pool"],
            sort_by="price_asc",
            page=2,
            page_size=15,
        )