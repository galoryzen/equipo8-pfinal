from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from shared.internal_auth import require_internal_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import get_db_session, get_user_repository
from app.config import settings

router = APIRouter(
    dependencies=[Depends(require_internal_token(lambda: settings.INTERNAL_SERVICE_TOKEN))]
)


class UserContactOut(BaseModel):
    id: UUID
    full_name: str
    email: str


@router.get("/users/{user_id}/contact", response_model=UserContactOut)
async def get_user_contact(
    user_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> UserContactOut:
    user = await get_user_repository(session).get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserContactOut(id=user.id, full_name=user.full_name, email=user.email)
