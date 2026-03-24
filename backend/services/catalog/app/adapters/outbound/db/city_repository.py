from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import City, Property, PropertyStatus


class SqlAlchemyCityRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def search(self, q: str, limit: int = 20) -> list[City]:
        active_city_ids = select(Property.city_id).where(Property.status == PropertyStatus.ACTIVE).distinct().subquery()
        stmt = (
            select(City)
            .where(
                City.id.in_(select(active_city_ids)),
                City.name.ilike(f"%{q}%"),
            )
            .order_by(City.name)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars())

    async def get_featured(self, limit: int = 4) -> list[City]:
        stmt = (
            select(City)
            .join(Property, Property.city_id == City.id)
            .where(
                City.image_url.is_not(None),
                Property.status == PropertyStatus.ACTIVE,
            )
            .group_by(City.id)
            .order_by(func.count(Property.id).desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars())
