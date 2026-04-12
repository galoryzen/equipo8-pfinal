"""
Regression: ORM tables must be bound to schema `booking` so SQL is not emitted as
unqualified `FROM booking`, which breaks when PostgreSQL search_path does not include
the booking schema (detail vs list can surface differently under load/pooling).
"""

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.domain.models import BOOKING_SCHEMA, Booking, BookingItem


def test_booking_tables_declare_postgres_schema():
    assert Booking.__table__.schema == BOOKING_SCHEMA
    assert BookingItem.__table__.schema == BOOKING_SCHEMA


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


def test_booking_item_foreign_key_targets_booking_table():
    fk = next(iter(BookingItem.__table__.foreign_keys))
    assert fk.column.table.fullname == f"{BOOKING_SCHEMA}.booking"
