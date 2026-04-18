"""
Regression: ORM tables must be bound to schema `booking` so SQL is not emitted as
unqualified `FROM booking`, which breaks when PostgreSQL search_path does not include
the booking schema (detail vs list can surface differently under load/pooling).
"""

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.domain.models import BOOKING_SCHEMA, Booking


def test_booking_tables_declare_postgres_schema():
    assert Booking.__table__.schema == BOOKING_SCHEMA


def test_select_booking_emits_schema_qualified_table():
    uid = uuid4()
    stmt = select(Booking).where(Booking.user_id == uid)
    compiled = str(
        stmt.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": False},
        )
    )
    # e.g. FROM booking.booking (schema + table name "booking")
    assert f"{BOOKING_SCHEMA}.booking" in compiled


def test_booking_has_flat_room_columns():
    """1 booking = 1 room type. Columns live directly on booking (no booking_item)."""
    cols = {c.name for c in Booking.__table__.columns}
    assert "property_id" in cols
    assert "room_type_id" in cols
    assert "rate_plan_id" in cols
    assert "unit_price" in cols
