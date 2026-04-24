"""SqlAlchemyManagerRepository — adapter tests with mocked AsyncSession."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.manager_repository import SqlAlchemyManagerRepository
from app.domain.models import CancellationPolicyType, DiscountType, Promotion
from app.schemas.manager import CreatePromotionIn, UpdateCancellationPolicyIn


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
