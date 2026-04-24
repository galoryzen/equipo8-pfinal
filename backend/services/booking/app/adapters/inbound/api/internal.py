from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import get_db_session
from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.application.use_cases.get_property_stats import GetPropertyStatsUseCase

router = APIRouter()


class PropertyStatsOut(BaseModel):
    active_bookings: int
    monthly_revenue: float


@router.get("/internal/properties/{property_id}/stats", response_model=PropertyStatsOut)
async def get_property_stats(
    property_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    repo = SqlAlchemyBookingRepository(session)
    use_case = GetPropertyStatsUseCase(repo)
    result = await use_case.execute(property_id=property_id)
    return result
