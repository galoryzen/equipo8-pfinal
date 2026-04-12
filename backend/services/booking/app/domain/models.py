import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class BookingStatus(str, enum.Enum):
    CART = "CART"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class CancellationPolicyType(str, enum.Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    NON_REFUNDABLE = "NON_REFUNDABLE"


class Base(DeclarativeBase):
    pass


BOOKING_SCHEMA = "booking"


class Booking(Base):
    __tablename__ = "booking"
    __table_args__ = {"schema": BOOKING_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="booking_status", native_enum=True),
        nullable=False,
    )
    checkin: Mapped[date] = mapped_column(nullable=False)
    checkout: Mapped[date] = mapped_column(nullable=False)
    hold_expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    policy_type_applied: Mapped[CancellationPolicyType] = mapped_column(
        SAEnum(CancellationPolicyType, name="cancellation_policy_type", native_enum=True),
        nullable=False,
    )
    policy_hours_limit_applied: Mapped[int | None] = mapped_column(nullable=True)
    policy_refund_percent_applied: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    items: Mapped[list["BookingItem"]] = relationship(
        back_populates="booking",
    )


class BookingItem(Base):
    __tablename__ = "booking_item"
    __table_args__ = {"schema": BOOKING_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(Booking.id),
        nullable=False,
    )
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    room_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    booking: Mapped[Booking] = relationship(back_populates="items")
