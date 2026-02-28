import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Booking(Base):
    __tablename__ = "booking"
    __table_args__ = {"schema": "booking"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    status: Mapped[str] = mapped_column(String(30), default="CART")
    checkin: Mapped[date] = mapped_column(Date)
    checkout: Mapped[date] = mapped_column(Date)
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency_code: Mapped[str] = mapped_column(String(3), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BookingItem(Base):
    __tablename__ = "booking_item"
    __table_args__ = {"schema": "booking"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    property_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    room_type_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2))
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2))
