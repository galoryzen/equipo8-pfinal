"""Pydantic validation tests for manager API schemas."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.manager import (
    CreatePromotionIn,
    ManagerHotelItem,
    RatePlanCancellationPolicyOut,
    RoomTypeManagerItem,
    UpdateCancellationPolicyIn,
)


class TestCreatePromotionIn:
    def test_accepts_percent_and_fixed(self):
        rid = uuid4()
        pct = CreatePromotionIn(
            rate_plan_id=rid,
            name="Sale",
            discount_type="PERCENT",
            discount_value=Decimal("10"),
            start_date=date(2026, 5, 1),
            end_date=date(2026, 5, 31),
        )
        fixed = CreatePromotionIn(
            rate_plan_id=rid,
            name="Sale",
            discount_type="FIXED",
            discount_value=Decimal("10"),
            start_date=date(2026, 5, 1),
            end_date=date(2026, 5, 31),
        )
        assert pct.discount_type == "PERCENT"
        assert fixed.discount_type == "FIXED"

    def test_rejects_invalid_discount_type(self):
        with pytest.raises(ValidationError):
            CreatePromotionIn.model_validate(
                {
                    "rate_plan_id": uuid4(),
                    "name": "X",
                    "discount_type": "BOGO",
                    "discount_value": "1",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-02",
                }
            )


class TestUpdateCancellationPolicyIn:
    def test_all_policy_types(self):
        assert UpdateCancellationPolicyIn(type="FULL").type == "FULL"
        assert UpdateCancellationPolicyIn(type="NON_REFUNDABLE").type == "NON_REFUNDABLE"
        p = UpdateCancellationPolicyIn(type="PARTIAL", refund_percent=40)
        assert p.refund_percent == 40

    def test_rejects_unknown_type(self):
        with pytest.raises(ValidationError):
            UpdateCancellationPolicyIn.model_validate({"type": "FREE_CANCELLATION"})


class TestManagerHotelItem:
    def test_both_status_literals(self):
        hid = uuid4()
        active = ManagerHotelItem(
            id=hid,
            name="H",
            location="A, B",
            totalRooms=1,
            occupiedRooms=0,
            status="ACTIVE",
            imageUrl=None,
            categories=1,
        )
        pending = ManagerHotelItem(
            id=hid,
            name="H",
            location="A, B",
            totalRooms=1,
            occupiedRooms=0,
            status="PENDING_REVIEW",
            imageUrl=None,
            categories=1,
        )
        assert active.status == "ACTIVE"
        assert pending.status == "PENDING_REVIEW"

    def test_rejects_invalid_status(self):
        with pytest.raises(ValidationError):
            ManagerHotelItem.model_validate(
                {
                    "id": uuid4(),
                    "name": "H",
                    "location": "",
                    "totalRooms": 0,
                    "occupiedRooms": 0,
                    "status": "CLOSED",
                    "imageUrl": None,
                    "categories": 0,
                }
            )


class TestRoomTypeManagerItem:
    def test_optional_rate_plan(self):
        m = RoomTypeManagerItem(
            id=uuid4(),
            name="RT",
            icon="standard",
            available=1,
            total=2,
        )
        assert m.rate_plan_id is None


class TestRatePlanCancellationPolicyOut:
    def test_partial_shape(self):
        out = RatePlanCancellationPolicyOut(type="PARTIAL", refund_percent=25)
        assert out.refund_percent == 25
