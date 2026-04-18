from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_create_hold_use_case,
    get_db_session,
    get_release_hold_use_case,
)
from app.schemas.inventory import HoldRequest

router = APIRouter()


@router.post("/inventory/holds", status_code=status.HTTP_204_NO_CONTENT)
async def create_inventory_hold(
    payload: HoldRequest,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    use_case = get_create_hold_use_case(session)
    await use_case.execute(
        room_type_id=payload.room_type_id,
        checkin=payload.checkin,
        checkout=payload.checkout,
    )


@router.post("/inventory/holds/release", status_code=status.HTTP_204_NO_CONTENT)
async def release_inventory_hold(
    payload: HoldRequest,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    use_case = get_release_hold_use_case(session)
    await use_case.execute(
        room_type_id=payload.room_type_id,
        checkin=payload.checkin,
        checkout=payload.checkout,
    )
