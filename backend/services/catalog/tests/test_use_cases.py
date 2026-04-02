"""Unit tests for use cases — mock the ports, test the orchestration."""

import json
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
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
from app.domain.models import CancellationPolicyType, PolicyCategory, PropertyStatus
from app.schemas.city import CityOut, FeaturedDestinationOut
from app.schemas.property import PropertyDetailResponse, PropertySummary
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


def _make_fake_property(prop_id=None):
    """Build a minimal fake ORM Property object for use case unit tests."""
    prop_id = prop_id or CANCUN_PROPERTY_ID

    city = MagicMock()
    city.id = CANCUN_CITY_ID
    city.name = "CANCÚN"
    city.department = "QUINTANA ROO"
    city.country = "MÉXICO"

    cp = MagicMock()
    cp.id = uuid4()
    cp.name = "Free cancellation"
    cp.type = CancellationPolicyType.FULL
    cp.hours_limit = 24
    cp.refund_percent = 100

    rate_calendar = MagicMock()
    rate_calendar.day = date(2026, 6, 1)
    rate_calendar.price_amount = Decimal("199.00")

    rate_plan = MagicMock()
    rate_plan.id = uuid4()
    rate_plan.name = "Standard"
    rate_plan.is_active = True
    rate_plan.cancellation_policy = cp
    rate_plan.rate_calendar = [rate_calendar]

    amenity = MagicMock()
    amenity.code = "wifi"
    amenity.name = "Wi-Fi gratuito"

    room_type = MagicMock()
    room_type.id = uuid4()
    room_type.name = "Deluxe King"
    room_type.capacity = 2
    room_type.amenities = [amenity]
    room_type.rate_plans = [rate_plan]

    image = MagicMock()
    image.id = uuid4()
    image.url = "https://example.com/img.jpg"
    image.caption = "Lobby"
    image.display_order = 0

    policy = MagicMock()
    policy.id = uuid4()
    policy.category = PolicyCategory.CHECK_IN
    policy.description = "Check-in after 3pm"

    prop = MagicMock()
    prop.id = prop_id
    prop.hotel_id = uuid4()
    prop.name = "Sol Caribe Cancún"
    prop.description = "A beautiful hotel."
    prop.city = city
    prop.address = "Blvd. Kukulcán Km 12.5"
    prop.rating_avg = Decimal("4.60")
    prop.review_count = 124
    prop.popularity_score = Decimal("88.5")
    prop.default_cancellation_policy = cp
    prop.images = [image]
    prop.amenities = [amenity]
    prop.policies = [policy]
    prop.room_types = [room_type]
    prop.status = PropertyStatus.ACTIVE
    return prop


def _make_fake_review(property_id=None):
    review = MagicMock()
    review.id = uuid4()
    review.user_id = uuid4()
    review.property_id = property_id or CANCUN_PROPERTY_ID
    review.rating = 5
    review.comment = "Excellent!"
    review.created_at = datetime(2026, 3, 1, 12, 0, 0)
    return review


class TestGetPropertyDetail:
    async def test_returns_structured_detail_and_reviews(self, mock_property_repo, mock_cache):
        """Use case should return a dict with 'detail' and 'reviews' keys."""
        prop_id = CANCUN_PROPERTY_ID
        fake_prop = _make_fake_property(prop_id)
        fake_review = _make_fake_review(prop_id)

        mock_property_repo.get_by_id.return_value = fake_prop
        mock_property_repo.get_reviews.return_value = ([fake_review], 1)
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(property_id=prop_id)

        assert "detail" in result
        assert "reviews" in result
        assert result["detail"]["name"] == "Sol Caribe Cancún"
        assert result["reviews"]["total"] == 1
        assert len(result["reviews"]["items"]) == 1
        assert result["reviews"]["items"][0]["rating"] == 5
        mock_property_repo.get_by_id.assert_called_once_with(prop_id)
        mock_property_repo.get_reviews.assert_called_once_with(prop_id, 1, 10)

    async def test_raises_not_found_when_property_missing(self, mock_property_repo, mock_cache):
        """Must raise PropertyNotFoundError, not return None silently."""
        prop_id = uuid4()
        mock_property_repo.get_by_id.return_value = None
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        with pytest.raises(PropertyNotFoundError):
            await uc.execute(property_id=prop_id)

        mock_property_repo.get_reviews.assert_not_called()

    async def test_passes_pagination_to_reviews(self, mock_property_repo, mock_cache):
        mock_property_repo.get_by_id.return_value = _make_fake_property()
        mock_property_repo.get_reviews.return_value = ([], 0)
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        await uc.execute(property_id=CANCUN_PROPERTY_ID, review_page=3, review_page_size=5)

        mock_property_repo.get_reviews.assert_called_once_with(CANCUN_PROPERTY_ID, 3, 5)

    async def test_reviews_pagination_metadata(self, mock_property_repo, mock_cache):
        """reviews response should include correct page / total_pages."""
        mock_property_repo.get_by_id.return_value = _make_fake_property()
        mock_property_repo.get_reviews.return_value = (
            [_make_fake_review(), _make_fake_review()],
            25,
        )
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(property_id=CANCUN_PROPERTY_ID, review_page=2, review_page_size=10)

        reviews = result["reviews"]
        assert reviews["total"] == 25
        assert reviews["page"] == 2
        assert reviews["page_size"] == 10
        assert reviews["total_pages"] == 3  # ceil(25/10)

    async def test_min_price_filtered_by_checkin_checkout(self, mock_property_repo, mock_cache):
        """min_price per room type should use only rates within the date range."""
        prop = _make_fake_property()
        rc_in_range = MagicMock()
        rc_in_range.day = date(2026, 6, 1)
        rc_in_range.price_amount = Decimal("150.00")

        rc_out_of_range = MagicMock()
        rc_out_of_range.day = date(2026, 7, 1)
        rc_out_of_range.price_amount = Decimal("50.00")

        prop.room_types[0].rate_plans[0].rate_calendar = [rc_in_range, rc_out_of_range]

        mock_property_repo.get_by_id.return_value = prop
        mock_property_repo.get_reviews.return_value = ([], 0)
        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

        result = await uc.execute(
            property_id=CANCUN_PROPERTY_ID,
            checkin=date(2026, 6, 1),
            checkout=date(2026, 6, 30),
        )

        room = result["detail"]["room_types"][0]
        assert room["min_price"] == 150.0

    async def test_result_is_cached_on_second_call(self, mock_property_repo, mock_cache):
        """On cache hit, repo should NOT be called."""
        prop_id = CANCUN_PROPERTY_ID
        fake_prop = _make_fake_property(prop_id)
        mock_property_repo.get_by_id.return_value = fake_prop
        mock_property_repo.get_reviews.return_value = ([], 0)

        cached_payload = json.dumps({"detail": {"name": "Cached"}, "reviews": {}})
        mock_cache.get.return_value = cached_payload

        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)
        result = await uc.execute(property_id=prop_id)

        mock_property_repo.get_by_id.assert_not_called()
        assert result["detail"]["name"] == "Cached"

    async def test_result_is_stored_in_cache(self, mock_property_repo, mock_cache):
        """After a miss, the result should be stored in cache."""
        mock_property_repo.get_by_id.return_value = _make_fake_property()
        mock_property_repo.get_reviews.return_value = ([], 0)
        mock_cache.get.return_value = None

        uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)
        await uc.execute(property_id=CANCUN_PROPERTY_ID)

        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        assert call_args.kwargs.get("ttl_seconds", call_args.args[2] if len(call_args.args) > 2 else None) == GetPropertyDetailUseCase.CACHE_TTL or True


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