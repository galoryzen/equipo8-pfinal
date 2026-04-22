from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.adapters.inbound.api.dependencies import get_user_repository, get_db_session
from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import User
from app.schemas.login import UserOut
from uuid import UUID

router = APIRouter()

@router.get("/users/{user_id}", response_model=UserOut)
async def get_user_by_id(
    user_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    repo = get_user_repository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    hotel_id = await repo.get_hotel_id_by_user_id(user_id)
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=getattr(user, "full_name", None),
        phone=getattr(user, "phone", None),
        role=str(user.role) if hasattr(user, "role") else None,
        country_code=getattr(user, "country_code", None),
        hotel_id=str(hotel_id) if hotel_id else None,
    )
