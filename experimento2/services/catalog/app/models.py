import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Property(Base):
    __tablename__ = "property"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    country_code: Mapped[str] = mapped_column(String(2))


class RoomType(Base):
    __tablename__ = "room_type"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    property_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    name: Mapped[str] = mapped_column(String(255))
    capacity: Mapped[int] = mapped_column(Integer)


class RatePlan(Base):
    __tablename__ = "rate_plan"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    room_type_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)


class RateCalendar(Base):
    __tablename__ = "rate_calendar"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    day: Mapped[date] = mapped_column(Date)
    currency_code: Mapped[str] = mapped_column(String(3))
    price_amount: Mapped[float] = mapped_column(Numeric(12, 2))


class InventoryCalendar(Base):
    __tablename__ = "inventory_calendar"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    room_type_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    day: Mapped[date] = mapped_column(Date)
    available_units: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


