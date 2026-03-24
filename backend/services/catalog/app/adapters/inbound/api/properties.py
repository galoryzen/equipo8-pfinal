from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_cache,
    get_db_session,
    get_detail_use_case,
    get_featured_destinations_use_case,
    get_featured_use_case,
    get_search_cities_use_case,
    get_search_use_case,
)
from app.application.ports.outbound.cache_port import CachePort
from app.schemas.city import CityOut, FeaturedDestinationOut
from app.schemas.common import PaginatedResponse
from app.schemas.property import PropertySummary

router = APIRouter()


@router.get("/properties/featured", response_model=list[PropertySummary])
async def featured_properties(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_db_session),
):
    use_case = get_featured_use_case(session)
    return await use_case.execute(limit=limit)


@router.get("/destinations/featured", response_model=list[FeaturedDestinationOut])
async def featured_destinations(
    limit: int = Query(4, ge=1, le=20),
    session: AsyncSession = Depends(get_db_session),
):
    use_case = get_featured_destinations_use_case(session)
    return await use_case.execute(limit=limit)


@router.get("/properties", response_model=PaginatedResponse[PropertySummary])
async def search_properties(
    checkin: date = Query(...),
    checkout: date = Query(...),
    guests: int = Query(..., ge=1),
    city_id: UUID | None = Query(None),
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    amenities: str | None = Query(
        None, description="Comma-separated amenity codes"),
    sort_by: str = Query(
        "popularity", pattern="^(popularity|rating|price_asc|price_desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    cache: CachePort = Depends(get_cache),
):
    if checkout <= checkin:
        raise HTTPException(
            status_code=422, detail="checkout must be after checkin")

    amenity_codes = [c.strip() for c in amenities.split(",")
                     if c.strip()] if amenities else None

    use_case = get_search_use_case(session, cache)
    return await use_case.execute(
        checkin=checkin,
        checkout=checkout,
        guests=guests,
        city_id=city_id,
        min_price=min_price,
        max_price=max_price,
        amenity_codes=amenity_codes,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )


@router.get("/properties/{property_id}")
async def get_property_detail(
    property_id: UUID,
    checkin: date | None = Query(None),
    checkout: date | None = Query(None),
    review_page: int = Query(1, ge=1),
    review_page_size: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_db_session),
    cache: CachePort = Depends(get_cache),
) -> dict:
    if checkin and checkout and checkout <= checkin:
        raise HTTPException(
            status_code=422, detail="checkout must be after checkin")

    use_case = get_detail_use_case(session, cache)
    return await use_case.execute(
        property_id=property_id,
        checkin=checkin,
        checkout=checkout,
        review_page=review_page,
        review_page_size=review_page_size,
    )


@router.get("/cities", response_model=list[CityOut])
async def search_cities(
    q: str = Query(..., min_length=2),
    session: AsyncSession = Depends(get_db_session),
):
    use_case = get_search_cities_use_case(session)
    return await use_case.execute(q=q)
