from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from shared.internal_auth import require_internal_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import get_db_session, get_property_repository
from app.application.exceptions import PropertyNotFoundError
from app.application.use_cases.get_property_summary import GetPropertySummaryUseCase
from app.config import settings

router = APIRouter(
    dependencies=[Depends(require_internal_token(lambda: settings.INTERNAL_SERVICE_TOKEN))]
)


class PropertySummaryOut(BaseModel):
    id: UUID
    name: str
    city_name: str
    country: str
    image_url: str | None = None


@router.get("/properties/{property_id}/summary", response_model=PropertySummaryOut)
async def get_property_summary(
    property_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PropertySummaryOut:
    use_case = GetPropertySummaryUseCase(get_property_repository(session))
    try:
        summary = await use_case.execute(property_id)
    except PropertyNotFoundError:
        raise HTTPException(status_code=404, detail="Property not found") from None
    return PropertySummaryOut(
        id=summary.id,
        name=summary.name,
        city_name=summary.city_name,
        country=summary.country,
        image_url=summary.image_url,
    )
