import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.application.exceptions import (
    AmenityNotFoundError,
    PropertyImageNotFoundError,
    PropertyNotFoundError,
)
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.domain.models import (
    Amenity,
    CancellationPolicy,
    CancellationPolicyType,
    DiscountType,
    InventoryCalendar,
    PolicyCategory,
    Promotion,
    Property,
    PropertyImage,
    PropertyPolicy,
    RatePlan,
    RoomType,
    RoomTypeStatus,
)
from app.schemas.manager import (
    AddPropertyImageIn,
    CreatePromotionIn,
    UpdateCancellationPolicyIn,
    UpdateHotelProfileIn,
)


def _icon_from_name(name: str) -> str:
    """Derive a RoomTypeIcon string from a room type name."""
    lower = name.lower()
    if "penthouse" in lower:
        return "penthouse"
    if "suite" in lower:
        return "suite"
    if "king" in lower:
        return "king"
    if "double" in lower or "twin" in lower or "queen" in lower:
        return "double"
    return "standard"


class SqlAlchemyManagerRepository(ManagerRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_manager_hotels(
        self,
        hotel_id: UUID,
        page: int,
        page_size: int,
    ) -> tuple[list[dict], int]:
        today = datetime.now(timezone.utc).date()

        # Count total
        count_stmt = select(sa_func.count(Property.id)).where(Property.hotel_id == hotel_id)
        total: int = (await self._session.execute(count_stmt)).scalar() or 0

        if total == 0:
            return [], 0

        # Fetch properties (paginated) — city eager-loaded via joinedload
        prop_stmt = (
            select(Property)
            .options(joinedload(Property.city))
            .where(Property.hotel_id == hotel_id)
            .order_by(Property.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        prop_result = await self._session.execute(prop_stmt)
        properties = list(prop_result.unique().scalars().all())
        property_ids = [p.id for p in properties]

        # Batch load first image per property
        first_images: dict[UUID, str | None] = {pid: None for pid in property_ids}
        img_stmt = (
            select(PropertyImage)
            .where(PropertyImage.property_id.in_(property_ids))
            .order_by(PropertyImage.property_id, PropertyImage.display_order)
            .distinct(PropertyImage.property_id)
        )
        img_result = await self._session.execute(img_stmt)
        for img in img_result.scalars():
            first_images[img.property_id] = img.url

        # Count room types per property (categories)
        rt_count_stmt = (
            select(RoomType.property_id, sa_func.count(RoomType.id).label("rt_count"))
            .where(RoomType.property_id.in_(property_ids))
            .group_by(RoomType.property_id)
        )
        rt_count_result = await self._session.execute(rt_count_stmt)
        rt_counts: dict[UUID, int] = {row[0]: row[1] for row in rt_count_result.all()}

        # Total capacity per property: two-stage aggregate avoids correlated subquery.
        # Stage 1: max available_units per room_type (non-correlated GROUP BY).
        # Stage 2: sum those maxes by property_id.
        max_per_rt_cte = (
            select(
                InventoryCalendar.room_type_id,
                sa_func.max(InventoryCalendar.available_units).label("max_units"),
            )
            .join(RoomType, RoomType.id == InventoryCalendar.room_type_id)
            .where(RoomType.property_id.in_(property_ids))
            .group_by(InventoryCalendar.room_type_id)
            .cte("max_per_rt")
        )
        total_cap_stmt = (
            select(
                RoomType.property_id,
                sa_func.coalesce(sa_func.sum(max_per_rt_cte.c.max_units), 0).label("total_capacity"),
            )
            .join(max_per_rt_cte, max_per_rt_cte.c.room_type_id == RoomType.id, isouter=True)
            .where(RoomType.property_id.in_(property_ids))
            .group_by(RoomType.property_id)
        )
        total_cap_result = await self._session.execute(total_cap_stmt)
        total_capacity: dict[UUID, int] = {
            row[0]: int(row[1]) if row[1] is not None else 0
            for row in total_cap_result.all()
        }

        # Available units today per property
        avail_today_stmt = (
            select(
                RoomType.property_id,
                sa_func.coalesce(sa_func.sum(InventoryCalendar.available_units), 0).label("available_today"),
            )
            .join(InventoryCalendar, InventoryCalendar.room_type_id == RoomType.id)
            .where(
                RoomType.property_id.in_(property_ids),
                InventoryCalendar.day == today,
            )
            .group_by(RoomType.property_id)
        )
        avail_today_result = await self._session.execute(avail_today_stmt)
        available_today: dict[UUID, int] = {row[0]: int(row[1]) for row in avail_today_result.all()}

        items = []
        for prop in properties:
            total_rooms = total_capacity.get(prop.id, 0)
            avail = available_today.get(prop.id, 0)
            occupied = max(0, total_rooms - avail)
            status = "ACTIVE" if avail > 0 else "PENDING_REVIEW"

            city = prop.city
            location = f"{city.name}, {city.country}" if city else ""

            items.append({
                "id": prop.id,
                "name": prop.name,
                "location": location,
                "totalRooms": total_rooms,
                "occupiedRooms": occupied,
                "status": status,
                "imageUrl": first_images.get(prop.id),
                "categories": rt_counts.get(prop.id, 0),
            })

        return items, total

    async def get_property_occupancy(self, property_id: UUID) -> tuple[int, int]:
        """Return (available_today, total_capacity)."""
        today = datetime.now(timezone.utc).date()

        # Total capacity: two-stage aggregate avoids correlated subquery.
        max_per_rt_cte = (
            select(
                InventoryCalendar.room_type_id,
                sa_func.max(InventoryCalendar.available_units).label("max_units"),
            )
            .join(RoomType, RoomType.id == InventoryCalendar.room_type_id)
            .where(RoomType.property_id == property_id)
            .group_by(InventoryCalendar.room_type_id)
            .cte("max_per_rt")
        )
        total_stmt = select(sa_func.coalesce(sa_func.sum(max_per_rt_cte.c.max_units), 0))
        total_result = await self._session.execute(total_stmt)
        total_capacity = int(total_result.scalar() or 0)

        # Available today
        avail_stmt = (
            select(sa_func.coalesce(sa_func.sum(InventoryCalendar.available_units), 0))
            .join(RoomType, RoomType.id == InventoryCalendar.room_type_id)
            .where(
                RoomType.property_id == property_id,
                InventoryCalendar.day == today,
            )
        )
        avail_result = await self._session.execute(avail_stmt)
        available_today = int(avail_result.scalar() or 0)

        return available_today, total_capacity

    async def list_room_types_with_availability(
        self,
        property_id: UUID,
        page: int,
        page_size: int,
    ) -> tuple[list[dict], int]:
        today = datetime.now(timezone.utc).date()

        # Count total active room types for this property
        count_stmt = select(sa_func.count(RoomType.id)).where(
            RoomType.property_id == property_id,
            RoomType.status == RoomTypeStatus.ACTIVE,
        )
        total: int = (await self._session.execute(count_stmt)).scalar() or 0

        if total == 0:
            return [], 0

        # Paginated room types
        rt_stmt = (
            select(RoomType)
            .where(
                RoomType.property_id == property_id,
                RoomType.status == RoomTypeStatus.ACTIVE,
            )
            .order_by(RoomType.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rt_result = await self._session.execute(rt_stmt)
        room_types = list(rt_result.scalars().all())
        rt_ids = [rt.id for rt in room_types]

        # Max available_units per room type (total capacity)
        max_stmt = (
            select(InventoryCalendar.room_type_id, sa_func.max(InventoryCalendar.available_units).label("total"))
            .where(InventoryCalendar.room_type_id.in_(rt_ids))
            .group_by(InventoryCalendar.room_type_id)
        )
        max_result = await self._session.execute(max_stmt)
        totals: dict[UUID, int] = {row[0]: int(row[1]) for row in max_result.all()}

        # Available today per room type
        avail_stmt = (
            select(InventoryCalendar.room_type_id, InventoryCalendar.available_units)
            .where(
                InventoryCalendar.room_type_id.in_(rt_ids),
                InventoryCalendar.day == today,
            )
        )
        avail_result = await self._session.execute(avail_stmt)
        available: dict[UUID, int] = {row[0]: int(row[1]) for row in avail_result.all()}

        # First rate plan per room type (used by frontend for creating promotions)
        # DISTINCT ON avoids MIN(uuid) which PostgreSQL does not support
        rp_stmt = (
            select(RatePlan.room_type_id, RatePlan.id.label("rate_plan_id"))
            .where(RatePlan.room_type_id.in_(rt_ids))
            .distinct(RatePlan.room_type_id)
            .order_by(RatePlan.room_type_id)
        )
        rp_result = await self._session.execute(rp_stmt)
        rate_plan_ids: dict[UUID, UUID] = {row[0]: row[1] for row in rp_result.all()}

        items = []
        for rt in room_types:
            items.append({
                "id": rt.id,
                "name": rt.name,
                "icon": _icon_from_name(rt.name),
                "available": available.get(rt.id, 0),
                "total": totals.get(rt.id, 0),
                "rate_plan_id": rate_plan_ids.get(rt.id),
            })

        return items, total

    async def get_room_type_promotion(self, room_type_id: UUID) -> dict | None:
        stmt = (
            select(Promotion)
            .join(RatePlan, RatePlan.id == Promotion.rate_plan_id)
            .where(
                RatePlan.room_type_id == room_type_id,
                Promotion.is_active.is_(True),
            )
            .order_by(Promotion.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        promotion = result.scalar_one_or_none()
        if promotion is None:
            return None
        return {
            "id": promotion.id,
            "rate_plan_id": promotion.rate_plan_id,
            "name": promotion.name,
            "discount_type": promotion.discount_type.value,
            "discount_value": promotion.discount_value,
            "start_date": promotion.start_date,
            "end_date": promotion.end_date,
            "is_active": promotion.is_active,
        }

    async def delete_promotion(self, promotion_id: UUID) -> None:
        stmt = select(Promotion).where(Promotion.id == promotion_id)
        result = await self._session.execute(stmt)
        promotion = result.scalar_one_or_none()
        if promotion is None:
            raise ValueError("promotion not found")
        await self._session.delete(promotion)
        await self._session.commit()

    async def create_promotion(self, property_id: UUID, data: CreatePromotionIn) -> dict:
        # Verify the rate_plan belongs to a room_type in this property
        verify_stmt = (
            select(RatePlan.id)
            .join(RoomType, RoomType.id == RatePlan.room_type_id)
            .where(
                RatePlan.id == data.rate_plan_id,
                RoomType.property_id == property_id,
            )
        )
        result = await self._session.execute(verify_stmt)
        if result.scalar_one_or_none() is None:
            raise ValueError("rate_plan not found for this property")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        promotion = Promotion(
            id=uuid.uuid4(),
            rate_plan_id=data.rate_plan_id,
            name=data.name,
            discount_type=DiscountType[data.discount_type],
            discount_value=data.discount_value,
            start_date=data.start_date,
            end_date=data.end_date,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        self._session.add(promotion)
        await self._session.commit()
        await self._session.refresh(promotion)

        return {
            "id": promotion.id,
            "name": promotion.name,
            "discount_type": promotion.discount_type.value,
            "discount_value": promotion.discount_value,
            "start_date": promotion.start_date,
            "end_date": promotion.end_date,
            "is_active": promotion.is_active,
        }

    async def get_rate_plan_cancellation_policy(self, rate_plan_id: UUID) -> dict | None:
        stmt = (
            select(RatePlan)
            .options(joinedload(RatePlan.cancellation_policy))
            .where(RatePlan.id == rate_plan_id)
        )
        result = await self._session.execute(stmt)
        rate_plan = result.scalar_one_or_none()
        if rate_plan is None or rate_plan.cancellation_policy is None:
            return None
        cp = rate_plan.cancellation_policy
        return {
            "type": cp.type.value,
            "refund_percent": cp.refund_percent,
            "hours_limit": cp.hours_limit,
        }

    async def update_rate_plan_cancellation_policy(
        self, rate_plan_id: UUID, data: UpdateCancellationPolicyIn
    ) -> dict:
        policy_type = CancellationPolicyType[data.type]
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Find an existing matching cancellation policy row
        stmt = select(CancellationPolicy).where(
            CancellationPolicy.type == policy_type,
            CancellationPolicy.active.is_(True),
        )
        if data.type == "PARTIAL" and data.refund_percent is not None:
            stmt = stmt.where(CancellationPolicy.refund_percent == data.refund_percent)
        else:
            stmt = stmt.where(CancellationPolicy.refund_percent.is_(None))

        cp_result = await self._session.execute(stmt)
        cp = cp_result.scalar_one_or_none()

        if cp is None:
            # Create a canonical policy row for this type/refund combination
            name_map = {
                "FULL": "Fully Refundable",
                "PARTIAL": f"Partially Refundable ({data.refund_percent or 0}%)",
                "NON_REFUNDABLE": "Non-Refundable",
            }
            cp = CancellationPolicy(
                id=uuid.uuid4(),
                name=name_map[data.type],
                type=policy_type,
                refund_percent=data.refund_percent if data.type == "PARTIAL" else None,
                hours_limit=None,
                active=True,
                created_at=now,
                updated_at=now,
            )
            self._session.add(cp)
            await self._session.flush()

        # Link the rate plan to this policy
        rate_plan = await self._session.get(RatePlan, rate_plan_id)
        if rate_plan is None:
            raise ValueError("rate_plan not found")
        rate_plan.cancellation_policy_id = cp.id
        rate_plan.updated_at = now
        await self._session.commit()

        return {
            "type": cp.type.value,
            "refund_percent": cp.refund_percent,
            "hours_limit": cp.hours_limit,
        }

    # ── Hotel profile (manager) ──────────────────────────────────────────────

    async def _assert_property_owned_by_hotel(
        self, property_id: UUID, hotel_id: UUID
    ) -> Property:
        """Return the Property if it belongs to ``hotel_id``, else raise 404.

        Using PropertyNotFoundError (not 403) intentionally avoids leaking the
        existence of properties owned by a different hotel.
        """
        stmt = (
            select(Property)
            .options(joinedload(Property.city))
            .where(Property.id == property_id, Property.hotel_id == hotel_id)
        )
        result = await self._session.execute(stmt)
        prop = result.unique().scalar_one_or_none()
        if prop is None:
            raise PropertyNotFoundError(property_id)
        return prop

    @staticmethod
    def _renumber_images(images: list[PropertyImage]) -> None:
        """Reset display_order to 0..N-1 in the given list's iteration order."""
        for index, image in enumerate(images):
            image.display_order = index

    async def _load_property_images(self, property_id: UUID) -> list[PropertyImage]:
        stmt = (
            select(PropertyImage)
            .where(PropertyImage.property_id == property_id)
            .order_by(PropertyImage.display_order)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def _load_property_amenity_codes(self, property_id: UUID) -> list[str]:
        from app.domain.models import property_amenity_table

        stmt = (
            select(Amenity.code)
            .join(property_amenity_table, property_amenity_table.c.amenity_id == Amenity.id)
            .where(property_amenity_table.c.property_id == property_id)
            .order_by(Amenity.code)
        )
        result = await self._session.execute(stmt)
        return [row[0] for row in result.all()]

    async def _load_general_policy_text(self, property_id: UUID) -> str:
        stmt = select(PropertyPolicy).where(
            PropertyPolicy.property_id == property_id,
            PropertyPolicy.category == PolicyCategory.GENERAL,
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return row.description if row is not None else ""

    @staticmethod
    def _serialize_image(image: PropertyImage) -> dict:
        return {
            "id": image.id,
            "url": image.url,
            "caption": image.caption,
            "display_order": image.display_order,
        }

    async def _build_profile_payload(self, prop: Property) -> dict:
        amenity_codes = await self._load_property_amenity_codes(prop.id)
        policy_text = await self._load_general_policy_text(prop.id)
        images = await self._load_property_images(prop.id)
        city_name = prop.city.name if prop.city else ""
        country = prop.city.country if prop.city else ""
        return {
            "id": prop.id,
            "name": prop.name,
            "description": prop.description,
            "city": city_name,
            "country": country,
            "amenity_codes": amenity_codes,
            "policy": policy_text,
            "images": [self._serialize_image(img) for img in images],
        }

    async def get_hotel_profile(self, property_id: UUID, hotel_id: UUID) -> dict:
        prop = await self._assert_property_owned_by_hotel(property_id, hotel_id)
        return await self._build_profile_payload(prop)

    async def update_hotel_profile(
        self, property_id: UUID, hotel_id: UUID, data: UpdateHotelProfileIn
    ) -> dict:
        prop = await self._assert_property_owned_by_hotel(property_id, hotel_id)
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if data.description is not None:
            prop.description = data.description

        if data.amenity_codes is not None:
            await self._replace_property_amenities(property_id, data.amenity_codes)

        if data.policy is not None:
            await self._upsert_general_policy(property_id, data.policy, now)

        await self._session.commit()
        return await self._build_profile_payload(prop)

    async def _replace_property_amenities(
        self, property_id: UUID, codes: list[str]
    ) -> None:
        from app.domain.models import property_amenity_table

        unique_codes = list({code for code in codes if code})

        if not unique_codes:
            await self._session.execute(
                property_amenity_table.delete().where(
                    property_amenity_table.c.property_id == property_id
                )
            )
            return

        stmt = select(Amenity).where(Amenity.code.in_(unique_codes))
        result = await self._session.execute(stmt)
        amenities = list(result.scalars().all())
        found_codes = {a.code for a in amenities}
        missing = sorted(c for c in unique_codes if c not in found_codes)
        if missing:
            raise AmenityNotFoundError(missing)

        await self._session.execute(
            property_amenity_table.delete().where(
                property_amenity_table.c.property_id == property_id
            )
        )
        if amenities:
            await self._session.execute(
                property_amenity_table.insert(),
                [{"property_id": property_id, "amenity_id": a.id} for a in amenities],
            )

    async def _upsert_general_policy(
        self, property_id: UUID, text: str, now: datetime
    ) -> None:
        stmt = select(PropertyPolicy).where(
            PropertyPolicy.property_id == property_id,
            PropertyPolicy.category == PolicyCategory.GENERAL,
        )
        existing = (await self._session.execute(stmt)).scalar_one_or_none()

        if not text:
            if existing is not None:
                await self._session.delete(existing)
            return

        if existing is None:
            self._session.add(
                PropertyPolicy(
                    id=uuid.uuid4(),
                    property_id=property_id,
                    category=PolicyCategory.GENERAL,
                    description=text,
                    created_at=now,
                    updated_at=now,
                )
            )
        else:
            existing.description = text
            existing.updated_at = now

    async def add_property_image(
        self, property_id: UUID, hotel_id: UUID, data: AddPropertyImageIn
    ) -> dict:
        await self._assert_property_owned_by_hotel(property_id, hotel_id)
        existing = await self._load_property_images(property_id)
        next_order = (max((img.display_order for img in existing), default=-1) + 1)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        image = PropertyImage(
            id=uuid.uuid4(),
            property_id=property_id,
            url=data.url,
            caption=data.caption,
            display_order=next_order,
            created_at=now,
        )
        self._session.add(image)
        await self._session.commit()
        await self._session.refresh(image)
        return self._serialize_image(image)

    async def delete_property_image(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> None:
        await self._assert_property_owned_by_hotel(property_id, hotel_id)
        images = await self._load_property_images(property_id)
        target = next((img for img in images if img.id == image_id), None)
        if target is None:
            raise PropertyImageNotFoundError(image_id)
        await self._session.delete(target)
        remaining = [img for img in images if img.id != image_id]
        self._renumber_images(remaining)
        await self._session.commit()

    async def set_primary_property_image(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> list[dict]:
        await self._assert_property_owned_by_hotel(property_id, hotel_id)
        images = await self._load_property_images(property_id)
        target = next((img for img in images if img.id == image_id), None)
        if target is None:
            raise PropertyImageNotFoundError(image_id)

        new_order = [target] + [img for img in images if img.id != image_id]
        self._renumber_images(new_order)
        await self._session.commit()
        return [self._serialize_image(img) for img in new_order]
