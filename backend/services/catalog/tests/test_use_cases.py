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

SEARCH_EMPTY_MSG = SearchPropertiesUseCase.EMPTY_RESULTS_MESSAGE


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
            city_id=CANCUN_CITY_ID,
        )

        assert result.total == 2
        assert result.page == 1
        assert result.total_pages == 1
        assert len(result.items) == 2
        assert all(isinstance(i, PropertySummary) for i in result.items)
        assert all(i.city.id == CANCUN_CITY_ID for i in result.items)

    async def test_ac1_repo_results_for_city_query_map_to_summaries(self, mock_property_repo, mock_cache):
        """AC1: for a given city_id query, every item in the page matches that city (repo is source of truth)."""
        other_id = uuid4()
        mock_property_repo.search.return_value = (
            [
                make_property_summary(),
                make_property_summary(name="Otro", id=other_id),
            ],
            2,
        )
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=CANCUN_CITY_ID,
        )

        mock_property_repo.search.assert_called_once()
        assert mock_property_repo.search.call_args.kwargs["city_id"] == CANCUN_CITY_ID
        assert len(result.items) == 2
        assert all(i.city.id == CANCUN_CITY_ID for i in result.items)

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
            city_id=CANCUN_CITY_ID,
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

    async def test_price_filter_only_min(self, mock_property_repo, mock_cache):
        """When only min_price is set, max_price should be None."""
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=CANCUN_CITY_ID,
            min_price=Decimal("100"),
        )

        call_kwargs = mock_property_repo.search.call_args.kwargs
        assert call_kwargs["min_price"] == Decimal("100")
        assert call_kwargs["max_price"] is None

    async def test_price_filter_only_max(self, mock_property_repo, mock_cache):
        """When only max_price is set, min_price should be None."""
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=CANCUN_CITY_ID,
            max_price=Decimal("300"),
        )

        call_kwargs = mock_property_repo.search.call_args.kwargs
        assert call_kwargs["min_price"] is None
        assert call_kwargs["max_price"] == Decimal("300")

    async def test_price_filter_preserves_other_filters(self, mock_property_repo, mock_cache):
        """Changing price range should not affect other filters passed to repo."""
        city_id = uuid4()
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=city_id,
            min_price=Decimal("80"),
            max_price=Decimal("150"),
            amenity_codes=["wifi"],
            sort_by="rating",
        )

        call_kwargs = mock_property_repo.search.call_args.kwargs
        assert call_kwargs["min_price"] == Decimal("80")
        assert call_kwargs["max_price"] == Decimal("150")
        assert call_kwargs["city_id"] == city_id
        assert call_kwargs["amenity_codes"] == ["wifi"]
        assert call_kwargs["sort_by"] == "rating"

    async def test_empty_total_sets_clear_message(self, mock_property_repo, mock_cache):
        """AC2–AC4: no inventory-eligible properties → empty list and clear message."""
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=CANCUN_CITY_ID,
        )

        assert result.items == []
        assert result.total == 0
        assert result.message == SEARCH_EMPTY_MSG

    async def test_non_empty_total_has_no_empty_message(self, mock_property_repo, mock_cache):
        mock_property_repo.search.return_value = ([make_property_summary()], 1)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 5),
            guests=2,
            city_id=CANCUN_CITY_ID,
        )

        assert result.message is None

    async def test_two_sequential_searches_recalculate(self, mock_property_repo, mock_cache):
        """AC5: each execute reflects that request's filters (no stale merge)."""
        other_city = uuid4()
        mock_property_repo.search.side_effect = [
            ([make_property_summary()], 1),
            ([], 0),
        ]
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        r1 = await uc.execute(
            checkin=date(2026, 4, 1),
            checkout=date(2026, 4, 3),
            guests=2,
            city_id=CANCUN_CITY_ID,
        )
        r2 = await uc.execute(
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 10),
            guests=1,
            city_id=other_city,
        )

        assert len(r1.items) == 1
        assert r1.total == 1
        assert r2.total == 0
        assert r2.message == SEARCH_EMPTY_MSG
        assert mock_property_repo.search.call_count == 2
        assert mock_property_repo.search.call_args_list[0].kwargs["city_id"] == CANCUN_CITY_ID
        assert mock_property_repo.search.call_args_list[1].kwargs["city_id"] == other_city

    async def test_changing_guests_preserves_city_dates_and_other_filters(self, mock_property_repo, mock_cache):
        """AC3/AC4: al variar solo guests, ciudad/fechas/price siguen en la llamada al repo."""
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)
        checkin = date(2026, 10, 1)
        checkout = date(2026, 10, 5)

        await uc.execute(
            checkin=checkin,
            checkout=checkout,
            guests=2,
            city_id=CANCUN_CITY_ID,
            min_price=Decimal("40"),
            max_price=Decimal("250"),
        )
        await uc.execute(
            checkin=checkin,
            checkout=checkout,
            guests=4,
            city_id=CANCUN_CITY_ID,
            min_price=Decimal("40"),
            max_price=Decimal("250"),
        )

        assert mock_property_repo.search.call_count == 2
        first = mock_property_repo.search.call_args_list[0].kwargs
        second = mock_property_repo.search.call_args_list[1].kwargs
        assert first["guests"] == 2
        assert second["guests"] == 4
        assert first["checkin"] == second["checkin"] == checkin
        assert first["checkout"] == second["checkout"] == checkout
        assert first["city_id"] == second["city_id"] == CANCUN_CITY_ID
        assert first["min_price"] == second["min_price"] == Decimal("40")
        assert first["max_price"] == second["max_price"] == Decimal("250")

    async def test_extreme_guests_empty_repo_gets_standard_empty_message(self, mock_property_repo, mock_cache):
        """AC5: guests muy alto sin matches → mismo mensaje de vacío que el resto de búsquedas."""
        mock_property_repo.search.return_value = ([], 0)
        uc = SearchPropertiesUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            checkin=date(2026, 11, 1),
            checkout=date(2026, 11, 4),
            guests=500,
            city_id=CANCUN_CITY_ID,
        )

        mock_property_repo.search.assert_called_once()
        assert mock_property_repo.search.call_args.kwargs["guests"] == 500
        assert result.items == []
        assert result.total == 0
        assert result.message == SEARCH_EMPTY_MSG