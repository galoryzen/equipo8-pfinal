from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.city_repository import CityRepository as CityRepositoryPort
from app.domain.models import City, Property, PropertyStatus


class SqlAlchemyCityRepository(CityRepositoryPort):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def search(self, q: str, limit: int = 20) -> list[City]:
        active_city_ids = select(Property.city_id).where(Property.status == PropertyStatus.ACTIVE).distinct().subquery()
        pattern = f"%{q}%"
        # unaccent() for accent-insensitive matching (e.g. "Mex" matches "México")
        ua = func.unaccent
        stmt = (
            select(City)
            .where(
                City.id.in_(select(active_city_ids)),
                or_(
                    ua(City.name).ilike(ua(pattern)),
                    ua(City.department).ilike(ua(pattern)),
                    ua(City.country).ilike(ua(pattern)),
                ),
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
