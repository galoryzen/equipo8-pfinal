import json
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.application.exceptions import PropertyNotFoundError
from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.property_repository import PropertyRepository
from app.domain.models import Property, RatePlan, RoomType
from app.schemas.common import PaginatedResponse
from app.schemas.property import (
    AmenitySummary,
    CancellationPolicyOut,
    CitySummary,
    PropertyDetail,
    PropertyDetailResponse,
    PropertyImageOut,
    PropertyPolicyOut,
    RatePlanOut,
    ReviewOut,
    RoomTypeOut,
)


class GetPropertyDetailUseCase:
    CACHE_TTL = 300

    def __init__(self, repo: PropertyRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self,
        property_id: UUID,
        checkin: date | None = None,
        checkout: date | None = None,
        review_page: int = 1,
        review_page_size: int = 10,
    ) -> dict:
        cache_key = (
            f"property_detail:{property_id}"
            f":ci={checkin}:co={checkout}"
            f":rp={review_page}:rs={review_page_size}"
        )

        cached = await self._cache.get(cache_key)
        if cached:
            return json.loads(cached)

        prop = await self._repo.get_by_id(property_id)
        if not prop:
            raise PropertyNotFoundError(property_id)

        reviews_list, review_total = await self._repo.get_reviews(
            property_id, review_page, review_page_size
        )

        detail = self._build_detail(prop, checkin, checkout)
        reviews_page = PaginatedResponse[ReviewOut].build(
            items=[self._map_review(r) for r in reviews_list],
            total=review_total,
            page=review_page,
            page_size=review_page_size,
        )

        response = PropertyDetailResponse(detail=detail, reviews=reviews_page)
        response_dict = response.model_dump(mode="json")

        await self._cache.set(cache_key, json.dumps(response_dict), self.CACHE_TTL)
        return response_dict

    # ── private helpers ─────────────────────────────────────────────────────

    def _build_detail(
        self,
        prop: Property,
        checkin: date | None,
        checkout: date | None,
    ) -> PropertyDetail:
        city = prop.city
        cancellation_policy = (
            self._map_cancellation_policy(prop.default_cancellation_policy)
            if prop.default_cancellation_policy
            else None
        )

        return PropertyDetail(
            id=prop.id,
            hotel_id=prop.hotel_id,
            name=prop.name,
            description=prop.description,
            city=CitySummary(
                id=city.id,
                name=city.name,
                department=city.department,
                country=city.country,
            ),
            address=prop.address,
            rating_avg=prop.rating_avg,
            review_count=prop.review_count,
            popularity_score=prop.popularity_score,
            default_cancellation_policy=cancellation_policy,
            images=[
                PropertyImageOut(
                    id=img.id,
                    url=img.url,
                    caption=img.caption,
                    display_order=img.display_order,
                )
                for img in sorted(prop.images, key=lambda i: i.display_order)
            ],
            amenities=[
                AmenitySummary(code=a.code, name=a.name) for a in prop.amenities
            ],
            policies=[
                PropertyPolicyOut(
                    id=p.id,
                    category=p.category.value,
                    description=p.description,
                )
                for p in prop.policies
            ],
            room_types=[
                self._map_room_type(rt, checkin, checkout) for rt in prop.room_types
            ],
        )

    def _map_room_type(
        self,
        rt: RoomType,
        checkin: date | None,
        checkout: date | None,
    ) -> RoomTypeOut:
        rate_plans = [self._map_rate_plan(rp, checkin, checkout) for rp in rt.rate_plans if rp.is_active]
        min_price: Decimal | None = None
        prices = [rp.min_price for rp in rate_plans if rp.min_price is not None]
        if prices:
            min_price = min(prices)

        return RoomTypeOut(
            id=rt.id,
            name=rt.name,
            capacity=rt.capacity,
            amenities=[AmenitySummary(code=a.code, name=a.name) for a in rt.amenities],
            rate_plans=rate_plans,
            min_price=min_price,
        )

    def _map_rate_plan(
        self,
        rp: RatePlan,
        checkin: date | None,
        checkout: date | None,
    ) -> RatePlanOut:
        min_price: Decimal | None = None
        if rp.rate_calendar:
            calendar = rp.rate_calendar
            if checkin and checkout:
                calendar = [
                    rc for rc in calendar if checkin <= rc.day < checkout
                ]
            if calendar:
                min_price = min(rc.price_amount for rc in calendar)

        return RatePlanOut(
            id=rp.id,
            name=rp.name,
            cancellation_policy=(
                self._map_cancellation_policy(rp.cancellation_policy)
                if rp.cancellation_policy
                else None
            ),
            min_price=min_price,
        )

    @staticmethod
    def _map_cancellation_policy(cp) -> CancellationPolicyOut:
        return CancellationPolicyOut(
            id=cp.id,
            name=cp.name,
            type=cp.type.value,
            hours_limit=cp.hours_limit,
            refund_percent=cp.refund_percent,
        )

    @staticmethod
    def _map_review(r) -> ReviewOut:
        return ReviewOut(
            id=r.id,
            user_id=r.user_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
        )
