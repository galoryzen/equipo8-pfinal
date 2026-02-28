import logging
import time
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from ..database import async_session
from ..models import InventoryCalendar, RateCalendar, RatePlan
from ..schemas import CreateHoldRequest, HoldCreatedResponse

router = APIRouter(prefix="/api/catalog", tags=["holds"])
logger = logging.getLogger("catalog.holds")


@router.post("/holds", response_model=HoldCreatedResponse, status_code=201)
async def create_hold(req: CreateHoldRequest):
    t0 = time.perf_counter()

    if req.checkout <= req.checkin:
        raise HTTPException(status_code=422, detail="checkout must be after checkin")

    async with async_session() as session:
        async with session.begin():
            # 1. SELECT FOR UPDATE on inventory_calendar rows
            # ORDER BY day to prevent deadlocks
            t_lock = time.perf_counter()
            inv_query = (
                select(InventoryCalendar)
                .where(
                    InventoryCalendar.room_type_id == req.room_type_id,
                    InventoryCalendar.day >= req.checkin,
                    InventoryCalendar.day < req.checkout,
                )
                .order_by(InventoryCalendar.day)
                .with_for_update()
            )
            result = await session.execute(inv_query)
            rows = result.scalars().all()
            lock_wait_ms = (time.perf_counter() - t_lock) * 1000

            # Validate all dates have inventory
            num_nights = (req.checkout - req.checkin).days
            if len(rows) != num_nights:
                raise HTTPException(
                    status_code=409,
                    detail=f"Inventory not found for all {num_nights} nights "
                    f"(found {len(rows)} rows)",
                )

            # 2. Check availability
            for row in rows:
                if row.available_units < req.quantity:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Insufficient inventory on {row.day}: "
                        f"available={row.available_units}, requested={req.quantity}",
                    )

            # 3. Decrement available_units
            t_write = time.perf_counter()
            row_ids = [row.id for row in rows]
            await session.execute(
                update(InventoryCalendar)
                .where(InventoryCalendar.id.in_(row_ids))
                .values(
                    available_units=InventoryCalendar.available_units - req.quantity,
                    updated_at=datetime.utcnow(),
                )
            )

            # 4. Calculate total from rate_calendar
            rp_query = (
                select(RatePlan.id)
                .where(
                    RatePlan.room_type_id == req.room_type_id,
                    RatePlan.is_active.is_(True),
                )
                .limit(1)
            )
            rp_result = await session.execute(rp_query)
            rate_plan_id = rp_result.scalar_one_or_none()

            total_amount = Decimal("0.00")
            currency_code = "USD"
            if rate_plan_id:
                rate_query = select(RateCalendar).where(
                    RateCalendar.rate_plan_id == rate_plan_id,
                    RateCalendar.day >= req.checkin,
                    RateCalendar.day < req.checkout,
                )
                rate_result = await session.execute(rate_query)
                rate_rows = rate_result.scalars().all()
                for rr in rate_rows:
                    total_amount += Decimal(str(rr.price_amount)) * req.quantity
                if rate_rows:
                    currency_code = rate_rows[0].currency_code

            write_ms = (time.perf_counter() - t_write) * 1000

        # 5. COMMIT happens here (exiting session.begin())
        total_ms = (time.perf_counter() - t0) * 1000

        logger.info(
            "hold_created room_type=%s lock_wait_ms=%.1f write_ms=%.1f total_ms=%.1f",
            req.room_type_id,
            lock_wait_ms,
            write_ms,
            total_ms,
        )

        return HoldCreatedResponse(
            room_type_id=req.room_type_id,
            checkin=req.checkin,
            checkout=req.checkout,
            quantity=req.quantity,
            total_amount=float(total_amount),
            currency_code=currency_code,
        )
