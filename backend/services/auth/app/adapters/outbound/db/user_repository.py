import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import (
    Agency,
    AgencyUser,
    Hotel,
    HotelUser,
    PartnerStatus,
    User,
)

class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, user_id) -> User | None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_hotel_id_by_user_id(self, user_id: uuid.UUID) -> uuid.UUID | None:
        result = await self._session.execute(
            select(HotelUser.hotel_id).where(
                HotelUser.user_id == user_id,
                HotelUser.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def check_user_exists(self, email: str) -> bool:
        user = await self.get_by_email(email)
        return user is not None

    async def create_user(self, user: User) -> User:
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def hotel_exists_and_active(self, hotel_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            select(Hotel.id).where(Hotel.id == hotel_id, Hotel.status == PartnerStatus.ACTIVE)
        )
        return result.scalar_one_or_none() is not None

    async def agency_exists_and_active(self, agency_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            select(Agency.id).where(Agency.id == agency_id, Agency.status == PartnerStatus.ACTIVE)
        )
        return result.scalar_one_or_none() is not None

    async def create_hotel_partner_user(self, user: User, hotel_id: uuid.UUID) -> User:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        self._session.add(user)
        await self._session.flush()
        link = HotelUser(
            id=uuid.uuid4(),
            hotel_id=hotel_id,
            user_id=user.id,
            is_active=True,
            created_at=now,
        )
        self._session.add(link)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def create_agency_partner_user(self, user: User, agency_id: uuid.UUID) -> User:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        self._session.add(user)
        await self._session.flush()
        link = AgencyUser(
            id=uuid.uuid4(),
            agency_id=agency_id,
            user_id=user.id,
            is_active=True,
            created_at=now,
        )
        self._session.add(link)
        await self._session.commit()
        await self._session.refresh(user)
        return user
