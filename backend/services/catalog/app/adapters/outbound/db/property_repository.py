from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.application.ports.outbound.property_repository import (
    PropertyRepository as PropertyRepositoryPort,
)
from app.domain.models import (
    Amenity,
    Property,
    PropertyImage,
    PropertyStatus,
    RateCalendar,
    RatePlan,
    Review,
    RoomType,
    RoomTypeStatus,
    property_amenity_table,
)


class SqlAlchemyPropertyRepository(PropertyRepositoryPort):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def search_featured(self, limit: int = 10) -> list[dict]:
        """Active properties by popularity with today's min price."""
        from sqlalchemy import func as sa_func

        # Min price for today per property
        today_price_sq = (
            select(
                RoomType.property_id.label("property_id"),
                sa_func.min(RateCalendar.price_amount).label("min_price"),
            )
            .join(RatePlan, RatePlan.room_type_id == RoomType.id)
            .join(RateCalendar, RateCalendar.rate_plan_id == RatePlan.id)
            .where(
                RoomType.status == RoomTypeStatus.ACTIVE,
                RatePlan.is_active == True,  # noqa: E712
                RateCalendar.day == sa_func.current_date(),
            )
            .group_by(RoomType.property_id)
            .subquery("today_price")
        )

        q = (
            select(Property, today_price_sq.c.min_price)
            .outerjoin(today_price_sq, today_price_sq.c.property_id == Property.id)
            .where(Property.status == PropertyStatus.ACTIVE)
            .options(joinedload(Property.city))
            .order_by(Property.popularity_score.desc())
            .limit(limit)
        )

        result = await self._session.execute(q)
        rows = result.unique().all()

        property_ids = [row[0].id for row in rows]

        # Batch load first images
        first_images: dict[UUID, PropertyImage] = {}
        if property_ids:
            img_q = (
                select(PropertyImage)
                .where(PropertyImage.property_id.in_(property_ids))
                .order_by(PropertyImage.property_id, PropertyImage.display_order)
                .distinct(PropertyImage.property_id)
            )
            img_result = await self._session.execute(img_q)
            for img in img_result.scalars():
                first_images[img.property_id] = img

        # Batch load amenities
        prop_amenities: dict[UUID, list] = {pid: [] for pid in property_ids}
        if property_ids:
            am_q = (
                select(property_amenity_table.c.property_id, Amenity)
                .join(Amenity, Amenity.id == property_amenity_table.c.amenity_id)
                .where(property_amenity_table.c.property_id.in_(property_ids))
            )
            am_result = await self._session.execute(am_q)
            for pid, amenity in am_result:
                prop_amenities[pid].append(amenity)

        items = []
        for prop, price in rows:
            img = first_images.get(prop.id)
            items.append(
                {
                    "id": prop.id,
                    "name": prop.name,
                    "city": {
                        "id": prop.city.id,
                        "name": prop.city.name,
                        "department": prop.city.department,
                        "country": prop.city.country,
                    },
                    "address": prop.address,
                    "rating_avg": round(float(prop.rating_avg), 1) if prop.rating_avg else None,
                    "review_count": prop.review_count,
                    "image": {"url": img.url, "caption": img.caption} if img else None,
                    "min_price": int(price) if price else None,
                    "amenities": [{"code": a.code, "name": a.name} for a in prop_amenities.get(prop.id, [])],
                }
            )

        return items

    # ── Stubs (not yet implemented) ──────────────────────

    async def search(self, **kwargs) -> tuple[list[dict], int]:
        raise NotImplementedError

    async def get_by_id(self, property_id: UUID) -> Property | None:
        raise NotImplementedError

    async def get_reviews(self, property_id: UUID, page: int = 1, page_size: int = 10) -> tuple[list[Review], int]:
        raise NotImplementedError

    async def get_min_prices(self, property_ids: list[UUID], checkin: date, checkout: date) -> dict[UUID, Decimal]:
        raise NotImplementedError
