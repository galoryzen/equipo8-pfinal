"""SqlAlchemyPropertyRepository.search — guest capacity & combined filters.

La historia de huéspedes se cumple con:
  HAVING sum(capacity * min_units) >= guests
(ver prop_capacity en property_repository.py).

Sin DB real: compilamos el SELECT del primer execute (count) para verificar
que el SQL incorpora umbral de huéspedes, ciudad y rango de fechas.
"""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy.dialects import postgresql

from app.adapters.outbound.db.property_repository import SqlAlchemyPropertyRepository


def _guest_capacity_having_fragment(guests: int) -> str:
    return f"sum(rt_avail.capacity * rt_avail.min_units) >= {guests}"


async def _search_and_capture_count_statement(
    *,
    checkin: date,
    checkout: date,
    guests: int,
    city_id: UUID,
    min_price=None,
    max_price=None,
    amenity_codes=None,
    sort_by: str = "popularity",
    page: int = 1,
    page_size: int = 20,
):
    """Ejecuta search con session mock; devuelve el statement del primer execute (count)."""
    session = AsyncMock()
    captured: list = []

    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []

    async def execute_side_effect(stmt, *args, **kwargs):
        captured.append(stmt)
        if len(captured) == 1:
            return count_result
        return rows_result

    session.execute = AsyncMock(side_effect=execute_side_effect)

    repo = SqlAlchemyPropertyRepository(session)
    await repo.search(
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
    assert len(captured) >= 1
    return captured[0]


def _compile_count_sql(stmt) -> str:
    return str(
        stmt.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


@pytest.mark.asyncio
async def test_search_returns_empty_when_count_is_zero():
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[count_result, rows_result])

    repo = SqlAlchemyPropertyRepository(session)
    items, total = await repo.search(
        checkin=date(2026, 4, 1),
        checkout=date(2026, 4, 3),
        guests=2,
        city_id=uuid4(),
    )

    assert total == 0
    assert items == []
    assert session.execute.await_count == 2


@pytest.mark.asyncio
async def test_search_sql_enforces_minimum_aggregate_guest_capacity():
    """AC1/AC2: solo propiedades con sum(capacity*min_units) >= guests entran en el JOIN."""
    cid = uuid4()
    guests = 7
    stmt = await _search_and_capture_count_statement(
        checkin=date(2026, 5, 1),
        checkout=date(2026, 5, 6),
        guests=guests,
        city_id=cid,
    )
    sql = _compile_count_sql(stmt)
    assert _guest_capacity_having_fragment(guests) in sql


@pytest.mark.asyncio
async def test_search_sql_guest_threshold_stricter_when_guests_increases():
    """AC4: al subir guests, el predicado de capacidad en SQL se endurece."""
    cid = uuid4()
    stmt_lo = await _search_and_capture_count_statement(
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        guests=3,
        city_id=cid,
    )
    stmt_hi = await _search_and_capture_count_statement(
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        guests=8,
        city_id=cid,
    )
    sql_lo = _compile_count_sql(stmt_lo)
    sql_hi = _compile_count_sql(stmt_hi)
    assert _guest_capacity_having_fragment(3) in sql_lo
    assert _guest_capacity_having_fragment(8) in sql_hi
    assert _guest_capacity_having_fragment(8) not in sql_lo


@pytest.mark.asyncio
async def test_search_sql_combines_city_dates_and_guest_filters():
    """AC3: misma consulta exige ciudad, disponibilidad en fechas y umbral de huéspedes."""
    cid = uuid4()
    checkin = date(2026, 7, 10)
    checkout = date(2026, 7, 15)
    stmt = await _search_and_capture_count_statement(
        checkin=checkin,
        checkout=checkout,
        guests=4,
        city_id=cid,
    )
    sql = _compile_count_sql(stmt)
    assert str(cid) in sql
    assert "inventory_calendar.day >= '2026-07-10'" in sql
    assert "inventory_calendar.day < '2026-07-15'" in sql
    assert "rate_calendar.day >= '2026-07-10'" in sql
    assert "rate_calendar.day < '2026-07-15'" in sql
    assert _guest_capacity_having_fragment(4) in sql


@pytest.mark.asyncio
async def test_search_sql_guest_filter_keeps_price_and_amenity_filters():
    """AC3: guests se acumula con min/max price y amenities (sin quitar otros filtros)."""
    cid = uuid4()
    stmt = await _search_and_capture_count_statement(
        checkin=date(2026, 8, 1),
        checkout=date(2026, 8, 5),
        guests=2,
        city_id=cid,
        min_price=50,
        max_price=300,
        amenity_codes=["wifi", "pool"],
    )
    sql = _compile_count_sql(stmt)
    assert _guest_capacity_having_fragment(2) in sql
    assert "min_price_sq.min_price >= 50" in sql.replace("\n", " ")
    assert "min_price_sq.min_price <= 300" in sql.replace("\n", " ")
    assert "amenity" in sql.lower()


@pytest.mark.asyncio
async def test_search_very_high_guests_returns_empty_consistently():
    """AC5: sin filas que cumplan capacidad → total 0 e items vacíos (mismo flujo que hoy)."""
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[count_result, rows_result])

    repo = SqlAlchemyPropertyRepository(session)
    items, total = await repo.search(
        checkin=date(2026, 9, 1),
        checkout=date(2026, 9, 3),
        guests=100,
        city_id=uuid4(),
    )

    assert total == 0
    assert items == []

    stmt = session.execute.await_args_list[0].args[0]
    sql = _compile_count_sql(stmt)
    assert _guest_capacity_having_fragment(100) in sql
