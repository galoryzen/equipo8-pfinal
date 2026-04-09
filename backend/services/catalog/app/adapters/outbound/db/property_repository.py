from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.application.ports.outbound.property_repository import (
    PropertyRepository as PropertyRepositoryPort,
)
from app.domain.models import (
    Amenity,
    InventoryCalendar,
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

    async def list_amenities(self) -> list[Amenity]:
        result = await self._session.execute(
            select(Amenity).order_by(Amenity.name)
        )
        return list(result.scalars().all())

    async def search_featured(self, limit: int = 10) -> list[dict]:
        """Active properties by popularity with today's min price."""
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

    async def search(
        self,
        checkin: date,
        checkout: date,
        guests: int,
        city_id: UUID | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        amenity_codes: list[str] | None = None,
        sort_by: str = "popularity",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        nights = (checkout - checkin).days

        inv_subq = (
            select(
                InventoryCalendar.room_type_id.label("room_type_id"),
                sa_func.min(InventoryCalendar.available_units).label("min_units"),
            )
            .where(
                InventoryCalendar.day >= checkin,
                InventoryCalendar.day < checkout,
                InventoryCalendar.available_units > 0,
            )
            .group_by(InventoryCalendar.room_type_id)
            .having(sa_func.count(sa_func.distinct(InventoryCalendar.day)) == nights)
        ).subquery("inv_subq")

        rt_avail = (
            select(
                RoomType.property_id.label("property_id"),
                RoomType.capacity.label("capacity"),
                inv_subq.c.min_units.label("min_units"),
            )
            .join(inv_subq, inv_subq.c.room_type_id == RoomType.id)
            .where(RoomType.status == RoomTypeStatus.ACTIVE)
        ).subquery("rt_avail")

        prop_capacity = (
            select(
                rt_avail.c.property_id.label("property_id"),
                sa_func.sum(rt_avail.c.capacity * rt_avail.c.min_units).label("guest_slots"),
            )
            .group_by(rt_avail.c.property_id)
            .having(sa_func.sum(rt_avail.c.capacity * rt_avail.c.min_units) >= guests)
        ).subquery("prop_capacity")

        min_price_sq = (
            select(
                RoomType.property_id.label("property_id"),
                sa_func.min(RateCalendar.price_amount).label("min_price"),
            )
            .join(RatePlan, RatePlan.room_type_id == RoomType.id)
            .join(RateCalendar, RateCalendar.rate_plan_id == RatePlan.id)
            .join(inv_subq, inv_subq.c.room_type_id == RoomType.id)
            .where(
                RoomType.status == RoomTypeStatus.ACTIVE,
                RatePlan.is_active == True,  # noqa: E712
                RateCalendar.day >= checkin,
                RateCalendar.day < checkout,
            )
            .group_by(RoomType.property_id)
        ).subquery("min_price_sq")

        base_q = (
            select(Property, min_price_sq.c.min_price)
            .join(min_price_sq, min_price_sq.c.property_id == Property.id)
            .join(prop_capacity, prop_capacity.c.property_id == Property.id)
            .where(Property.status == PropertyStatus.ACTIVE)
            .options(joinedload(Property.city))
        )
        if city_id is not None:
            base_q = base_q.where(Property.city_id == city_id)

        if min_price is not None:
            base_q = base_q.where(min_price_sq.c.min_price >= min_price)

        if max_price is not None:
            base_q = base_q.where(min_price_sq.c.min_price <= max_price)

        if amenity_codes:
            amenity_subq = (
                select(property_amenity_table.c.property_id)
                .join(Amenity, Amenity.id == property_amenity_table.c.amenity_id)
                .where(Amenity.code.in_(amenity_codes))
                .group_by(property_amenity_table.c.property_id)
                .having(sa_func.count(sa_func.distinct(Amenity.code)) == len(amenity_codes))
            )
            base_q = base_q.where(Property.id.in_(amenity_subq))

        query = base_q

        count_q = query.with_only_columns(sa_func.count()).order_by(None)
        total_result = await self._session.execute(count_q)
        total = total_result.scalar_one()

        if sort_by == "rating":
            query = query.order_by(Property.rating_avg.desc().nulls_last(), Property.id)
        elif sort_by == "price_asc":
            query = query.order_by(min_price_sq.c.min_price.asc().nulls_last(), Property.id)
        elif sort_by == "price_desc":
            query = query.order_by(min_price_sq.c.min_price.desc().nulls_last(), Property.id)
        else:
            query = query.order_by(Property.popularity_score.desc(), Property.id)

        # Paginación
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self._session.execute(query)
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

        return items, total

    async def get_by_id(self, property_id: UUID) -> Property | None:
        stmt = (
            select(Property)
            .options(
                joinedload(Property.city),
                joinedload(Property.default_cancellation_policy),
                selectinload(Property.images),
                selectinload(Property.amenities),
                selectinload(Property.policies),
                selectinload(Property.room_types).selectinload(RoomType.amenities),
                selectinload(Property.room_types)
                .selectinload(RoomType.rate_plans)
                .joinedload(RatePlan.cancellation_policy),
                selectinload(Property.room_types)
                .selectinload(RoomType.rate_plans)
                .selectinload(RatePlan.rate_calendar),
            )
            .where(
                Property.id == property_id,
                Property.status == PropertyStatus.ACTIVE,
            )
        )
        result = await self._session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_reviews(self, property_id: UUID, page: int = 1, page_size: int = 10) -> tuple[list[Review], int]:
        count_stmt = (
            select(sa_func.count())
            .select_from(Review)
            .where(Review.property_id == property_id)
        )
        total = (await self._session.execute(count_stmt)).scalar() or 0

        stmt = (
            select(Review)
            .where(Review.property_id == property_id)
            .order_by(Review.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return list(rows), total

    async def get_min_prices(self, property_ids: list[UUID], checkin: date, checkout: date) -> dict[UUID, Decimal]:
        stmt = (
            select(RoomType.property_id, sa_func.min(RateCalendar.price_amount))
            .join(RatePlan, RatePlan.room_type_id == RoomType.id)
            .join(RateCalendar, RateCalendar.rate_plan_id == RatePlan.id)
            .where(
                RoomType.property_id.in_(property_ids),
                RatePlan.is_active.is_(True),
                RateCalendar.day >= checkin,
                RateCalendar.day < checkout,
            )
            .group_by(RoomType.property_id)
        )
        rows = (await self._session.execute(stmt)).all()
        return {row[0]: row[1] for row in rows}
