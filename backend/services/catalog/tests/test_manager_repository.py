"""SqlAlchemyManagerRepository — adapter tests with mocked AsyncSession."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.manager_repository import SqlAlchemyManagerRepository
from app.application.exceptions import (
    AmenityNotFoundError,
    PropertyImageNotFoundError,
    PropertyNotFoundError,
)
from app.domain.models import (
    CancellationPolicyType,
    DiscountType,
    PolicyCategory,
    Promotion,
    PropertyImage,
    PropertyPolicy,
)
from app.schemas.manager import (
    AddPropertyImageIn,
    CreatePromotionIn,
    UpdateCancellationPolicyIn,
    UpdateHotelProfileIn,
)


def _scalar_result(value):
    r = MagicMock()
    r.scalar.return_value = value
    return r


class TestListManagerHotelsEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_when_count_zero(self):
        session = AsyncMock()
        session.execute = AsyncMock(return_value=_scalar_result(0))
        repo = SqlAlchemyManagerRepository(session)

        items, total = await repo.list_manager_hotels(uuid4(), page=1, page_size=10)

        assert items == []
        assert total == 0
        session.execute.assert_awaited_once()


class TestListRoomTypesEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_active_room_types(self):
        session = AsyncMock()
        session.execute = AsyncMock(return_value=_scalar_result(0))
        repo = SqlAlchemyManagerRepository(session)

        items, total = await repo.list_room_types_with_availability(uuid4(), page=1, page_size=10)

        assert items == []
        assert total == 0


class TestGetPropertyOccupancy:
    @pytest.mark.asyncio
    async def test_returns_available_and_total_from_scalars(self):
        total_r = MagicMock()
        total_r.scalar.return_value = 12
        avail_r = MagicMock()
        avail_r.scalar.return_value = 5
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[total_r, avail_r])
        repo = SqlAlchemyManagerRepository(session)

        avail, cap = await repo.get_property_occupancy(uuid4())

        assert (avail, cap) == (5, 12)
        assert session.execute.await_count == 2

    @pytest.mark.asyncio
    async def test_coerces_null_scalars_to_zero(self):
        total_r = MagicMock()
        total_r.scalar.return_value = None
        avail_r = MagicMock()
        avail_r.scalar.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[total_r, avail_r])
        repo = SqlAlchemyManagerRepository(session)

        avail, cap = await repo.get_property_occupancy(uuid4())

        assert (avail, cap) == (0, 0)


class TestGetRoomTypePromotion:
    @pytest.mark.asyncio
    async def test_none_when_no_row(self):
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.get_room_type_promotion(uuid4())

        assert out is None

    @pytest.mark.asyncio
    async def test_maps_active_promotion_row(self):
        promo = MagicMock()
        promo.id = uuid4()
        promo.rate_plan_id = uuid4()
        promo.name = "Spring"
        promo.discount_type = DiscountType.PERCENT
        promo.discount_value = Decimal("12.5")
        promo.start_date = date(2026, 3, 1)
        promo.end_date = date(2026, 3, 31)
        promo.is_active = True
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = promo
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.get_room_type_promotion(uuid4())

        assert out is not None
        assert out["id"] == promo.id
        assert out["discount_type"] == "PERCENT"
        assert out["discount_value"] == Decimal("12.5")


class TestDeletePromotion:
    @pytest.mark.asyncio
    async def test_raises_when_missing(self):
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(ValueError, match="promotion not found"):
            await repo.delete_promotion(uuid4())

        session.delete.assert_not_called()
        session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_deletes_and_commits_when_found(self):
        promo = MagicMock()
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = promo
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        session.delete = AsyncMock()
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        await repo.delete_promotion(uuid4())

        session.delete.assert_awaited_once_with(promo)
        session.commit.assert_awaited_once()


class TestCreatePromotion:
    @pytest.mark.asyncio
    async def test_raises_when_rate_plan_not_in_property(self):
        verify_result = MagicMock()
        verify_result.scalar_one_or_none.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=verify_result)
        repo = SqlAlchemyManagerRepository(session)
        data = CreatePromotionIn(
            rate_plan_id=uuid4(),
            name="X",
            discount_type="PERCENT",
            discount_value=Decimal("10"),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 10),
        )

        with pytest.raises(ValueError, match="rate_plan not found"):
            await repo.create_promotion(uuid4(), data)

        session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_inserts_promotion_and_returns_payload(self):
        verify_result = MagicMock()
        verify_result.scalar_one_or_none.return_value = uuid4()
        session = AsyncMock()
        session.execute = AsyncMock(return_value=verify_result)
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        data = CreatePromotionIn(
            rate_plan_id=uuid4(),
            name="Summer",
            discount_type="FIXED",
            discount_value=Decimal("25"),
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 15),
        )

        out = await repo.create_promotion(uuid4(), data)

        session.add.assert_called_once()
        added = session.add.call_args[0][0]
        assert isinstance(added, Promotion)
        assert added.name == "Summer"
        session.commit.assert_awaited_once()
        session.refresh.assert_awaited_once()
        assert out["name"] == "Summer"
        assert out["discount_type"] == "FIXED"
        assert out["is_active"] is True


class TestGetRatePlanCancellationPolicy:
    @pytest.mark.asyncio
    async def test_none_when_rate_plan_missing(self):
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        assert await repo.get_rate_plan_cancellation_policy(uuid4()) is None

    @pytest.mark.asyncio
    async def test_none_when_policy_not_linked(self):
        rp = MagicMock()
        rp.cancellation_policy = None
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = rp
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        assert await repo.get_rate_plan_cancellation_policy(uuid4()) is None

    @pytest.mark.asyncio
    async def test_returns_policy_fields(self):
        cp = MagicMock()
        cp.type = CancellationPolicyType.PARTIAL
        cp.refund_percent = 50
        cp.hours_limit = None
        rp = MagicMock()
        rp.cancellation_policy = cp
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = rp
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_result)
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.get_rate_plan_cancellation_policy(uuid4())

        assert out == {"type": "PARTIAL", "refund_percent": 50, "hours_limit": None}


class TestUpdateRatePlanCancellationPolicy:
    @pytest.mark.asyncio
    async def test_reuses_existing_matching_policy_row(self):
        cp_id = uuid4()
        existing = MagicMock()
        existing.id = cp_id
        existing.type = CancellationPolicyType.FULL
        existing.refund_percent = None
        existing.hours_limit = None
        cp_exec = MagicMock()
        cp_exec.scalar_one_or_none.return_value = existing
        rate_plan = MagicMock()
        rate_plan.cancellation_policy_id = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=cp_exec)
        session.get = AsyncMock(return_value=rate_plan)
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        rid = uuid4()

        out = await repo.update_rate_plan_cancellation_policy(rid, UpdateCancellationPolicyIn(type="FULL"))

        session.add.assert_not_called()
        assert rate_plan.cancellation_policy_id == cp_id
        session.commit.assert_awaited_once()
        assert out["type"] == "FULL"

    @pytest.mark.asyncio
    async def test_creates_policy_when_no_match_then_links(self):
        cp_exec = MagicMock()
        cp_exec.scalar_one_or_none.return_value = None
        rate_plan = MagicMock()
        rate_plan.cancellation_policy_id = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=cp_exec)
        session.flush = AsyncMock()
        session.get = AsyncMock(return_value=rate_plan)
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        rid = uuid4()

        out = await repo.update_rate_plan_cancellation_policy(
            rid, UpdateCancellationPolicyIn(type="NON_REFUNDABLE")
        )

        session.add.assert_called_once()
        added = session.add.call_args[0][0]
        assert added.type == CancellationPolicyType.NON_REFUNDABLE
        assert rate_plan.cancellation_policy_id == added.id
        assert out["type"] == "NON_REFUNDABLE"

    @pytest.mark.asyncio
    async def test_raises_when_rate_plan_row_missing(self):
        cp_exec = MagicMock()
        cp_exec.scalar_one_or_none.return_value = None
        session = AsyncMock()
        session.execute = AsyncMock(return_value=cp_exec)
        session.flush = AsyncMock()
        session.get = AsyncMock(return_value=None)
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(ValueError, match="rate_plan not found"):
            await repo.update_rate_plan_cancellation_policy(
                uuid4(), UpdateCancellationPolicyIn(type="FULL")
            )


def _ownership_result(prop_or_none):
    """Build a MagicMock that imitates session.execute()'s result for the
    property-ownership SELECT, where the code calls
    ``result.unique().scalar_one_or_none()``."""
    inner = MagicMock()
    inner.scalar_one_or_none.return_value = prop_or_none
    outer = MagicMock()
    outer.unique.return_value = inner
    return outer


def _scalars_result(items):
    inner = MagicMock()
    inner.all.return_value = items
    outer = MagicMock()
    outer.scalars.return_value = inner
    return outer


def _scalar_one_or_none(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


def _all_rows(rows):
    """Imitate result.all() returning row tuples."""
    r = MagicMock()
    r.all.return_value = rows
    return r


def _make_property(prop_id=None, name="Test Hotel", description="desc"):
    prop = MagicMock()
    prop.id = prop_id or uuid4()
    prop.name = name
    prop.description = description
    prop.city = MagicMock(name="City", country="USA")
    prop.city.name = "Miami"
    prop.city.country = "USA"
    return prop


def _make_image(image_id=None, display_order=0, url="https://example.com/x.jpg", caption=None):
    img = MagicMock(spec=PropertyImage)
    img.id = image_id or uuid4()
    img.url = url
    img.caption = caption
    img.display_order = display_order
    return img


class TestAssertPropertyOwnedByHotel:
    @pytest.mark.asyncio
    async def test_raises_when_property_not_owned(self):
        session = AsyncMock()
        session.execute = AsyncMock(return_value=_ownership_result(None))
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(PropertyNotFoundError):
            await repo._assert_property_owned_by_hotel(uuid4(), uuid4())

    @pytest.mark.asyncio
    async def test_returns_property_when_owned(self):
        prop = _make_property()
        session = AsyncMock()
        session.execute = AsyncMock(return_value=_ownership_result(prop))
        repo = SqlAlchemyManagerRepository(session)

        result = await repo._assert_property_owned_by_hotel(prop.id, uuid4())

        assert result is prop


class TestRenumberImages:
    def test_resets_display_order_in_iteration_order(self):
        images = [_make_image(display_order=5), _make_image(display_order=2), _make_image(display_order=9)]

        SqlAlchemyManagerRepository._renumber_images(images)

        assert [img.display_order for img in images] == [0, 1, 2]


class TestGetHotelProfile:
    @pytest.mark.asyncio
    async def test_404_when_not_owned(self):
        session = AsyncMock()
        session.execute = AsyncMock(return_value=_ownership_result(None))
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(PropertyNotFoundError):
            await repo.get_hotel_profile(uuid4(), uuid4())

    @pytest.mark.asyncio
    async def test_returns_full_profile_payload(self):
        prop = _make_property(name="Grand Plaza")
        prop.description = "Lovely place"
        # Sequence of session.execute() calls inside get_hotel_profile:
        # 1) ownership SELECT  -> _ownership_result(prop)
        # 2) amenity codes SELECT -> _all_rows([(code,), ...])
        # 3) GENERAL policy SELECT -> _scalar_one_or_none(policy_row)
        # 4) images SELECT      -> _scalars_result([img1])
        policy_row = MagicMock()
        policy_row.description = "Check-in 3pm."
        img = _make_image(display_order=0, url="https://example.com/a.jpg")
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _all_rows([("WIFI",), ("POOL",)]),
            _scalar_one_or_none(policy_row),
            _scalars_result([img]),
        ])
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.get_hotel_profile(prop.id, uuid4())

        assert out["name"] == "Grand Plaza"
        assert out["description"] == "Lovely place"
        assert out["city"] == "Miami"
        assert out["country"] == "USA"
        assert out["amenity_codes"] == ["WIFI", "POOL"]
        assert out["policy"] == "Check-in 3pm."
        assert len(out["images"]) == 1
        assert out["images"][0]["display_order"] == 0


class TestUpdateHotelProfile:
    @pytest.mark.asyncio
    async def test_unknown_amenity_code_raises(self):
        prop = _make_property()
        # Calls in order:
        # 1) ownership SELECT
        # 2) Amenity SELECT WHERE code IN (...) -> scalars.all() returns []
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result([]),
        ])
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        body = UpdateHotelProfileIn(amenity_codes=["BOGUS"])

        with pytest.raises(AmenityNotFoundError) as exc_info:
            await repo.update_hotel_profile(prop.id, uuid4(), body)

        assert exc_info.value.codes == ["BOGUS"]
        session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_empty_amenity_list_clears_join_table(self):
        prop = _make_property()
        # Calls inside the path with amenity_codes=[]:
        # 1) ownership
        # 2) DELETE FROM property_amenity WHERE property_id = ...
        # Then policy is None, description is None — straight to commit
        # 3..6) build_profile_payload re-reads (amenities, policy, images)
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            MagicMock(),  # delete result
            _all_rows([]),
            _scalar_one_or_none(None),
            _scalars_result([]),
        ])
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        body = UpdateHotelProfileIn(amenity_codes=[])

        out = await repo.update_hotel_profile(prop.id, uuid4(), body)

        assert out["amenity_codes"] == []
        session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_updates_description_only(self):
        prop = _make_property(description="old")
        # Calls: ownership, then re-read for build_profile_payload (amenities, policy, images)
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _all_rows([]),
            _scalar_one_or_none(None),
            _scalars_result([]),
        ])
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        body = UpdateHotelProfileIn(description="new description")

        out = await repo.update_hotel_profile(prop.id, uuid4(), body)

        assert prop.description == "new description"
        assert out["description"] == "new description"
        session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_empty_policy_deletes_existing_row(self):
        prop = _make_property()
        existing_policy = MagicMock(spec=PropertyPolicy)
        # Calls: ownership, then policy SELECT inside _upsert_general_policy,
        # then build_profile_payload reads (amenities, policy, images)
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalar_one_or_none(existing_policy),
            _all_rows([]),
            _scalar_one_or_none(None),
            _scalars_result([]),
        ])
        session.delete = AsyncMock()
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)
        body = UpdateHotelProfileIn(policy="")

        out = await repo.update_hotel_profile(prop.id, uuid4(), body)

        session.delete.assert_awaited_once_with(existing_policy)
        assert out["policy"] == ""


class TestAddPropertyImage:
    @pytest.mark.asyncio
    async def test_appends_with_next_display_order(self):
        prop = _make_property()
        existing = [_make_image(display_order=0), _make_image(display_order=1)]
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result(existing),
        ])
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.add_property_image(
            prop.id,
            uuid4(),
            AddPropertyImageIn(url="https://example.com/new.jpg", caption="hi"),
        )

        session.add.assert_called_once()
        added = session.add.call_args[0][0]
        assert isinstance(added, PropertyImage)
        assert added.url == "https://example.com/new.jpg"
        assert added.caption == "hi"
        assert added.display_order == 2
        session.commit.assert_awaited_once()
        assert out["url"] == "https://example.com/new.jpg"

    @pytest.mark.asyncio
    async def test_first_image_starts_at_zero(self):
        prop = _make_property()
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result([]),
        ])
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.add_property_image(
            prop.id, uuid4(), AddPropertyImageIn(url="https://example.com/a.jpg")
        )

        assert out["display_order"] == 0


class TestDeletePropertyImage:
    @pytest.mark.asyncio
    async def test_raises_when_image_not_found(self):
        prop = _make_property()
        existing = [_make_image()]
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result(existing),
        ])
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(PropertyImageNotFoundError):
            await repo.delete_property_image(prop.id, uuid4(), uuid4())

    @pytest.mark.asyncio
    async def test_deletes_and_renumbers_remaining(self):
        prop = _make_property()
        target_id = uuid4()
        target = _make_image(image_id=target_id, display_order=1)
        keep_a = _make_image(display_order=0)
        keep_b = _make_image(display_order=2)
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result([keep_a, target, keep_b]),
        ])
        session.delete = AsyncMock()
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        await repo.delete_property_image(prop.id, uuid4(), target_id)

        session.delete.assert_awaited_once_with(target)
        # keep_a was at 0 (already 0), keep_b was at 2, now should be 1
        assert keep_a.display_order == 0
        assert keep_b.display_order == 1
        session.commit.assert_awaited_once()


class TestSetPrimaryPropertyImage:
    @pytest.mark.asyncio
    async def test_raises_when_image_not_found(self):
        prop = _make_property()
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result([_make_image()]),
        ])
        repo = SqlAlchemyManagerRepository(session)

        with pytest.raises(PropertyImageNotFoundError):
            await repo.set_primary_property_image(prop.id, uuid4(), uuid4())

    @pytest.mark.asyncio
    async def test_promotes_target_and_renumbers(self):
        prop = _make_property()
        a = _make_image(display_order=0)
        b = _make_image(display_order=1)
        c = _make_image(display_order=2)
        session = AsyncMock()
        session.execute = AsyncMock(side_effect=[
            _ownership_result(prop),
            _scalars_result([a, b, c]),
        ])
        session.commit = AsyncMock()
        repo = SqlAlchemyManagerRepository(session)

        out = await repo.set_primary_property_image(prop.id, uuid4(), c.id)

        assert c.display_order == 0
        assert a.display_order == 1
        assert b.display_order == 2
        assert [item["id"] for item in out] == [c.id, a.id, b.id]
        session.commit.assert_awaited_once()
