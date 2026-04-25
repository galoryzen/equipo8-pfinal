from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_db_session,
    get_rate_plan_pricing_use_case,
)
from app.schemas.rate_plan import RatePlanPricingOut

router = APIRouter()


@router.get("/rate-plans/{rate_plan_id}/pricing", response_model=RatePlanPricingOut)
async def get_rate_plan_pricing(
    rate_plan_id: UUID,
    checkin: date = Query(...),
    checkout: date = Query(...),
    session: AsyncSession = Depends(get_db_session),
):
    if checkout <= checkin:
        raise HTTPException(status_code=422, detail="checkout must be after checkin")

    use_case = get_rate_plan_pricing_use_case(session)
    return await use_case.execute(
        rate_plan_id=rate_plan_id,
        checkin=checkin,
        checkout=checkout,
    )
