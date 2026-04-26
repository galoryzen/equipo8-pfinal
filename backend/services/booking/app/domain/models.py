import enum
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import ClassVar

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
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


class BookingScope(str, enum.Enum):
    ACTIVE = "active"
    PAST = "past"
    ALL = "all"


class Base(DeclarativeBase):
    pass


BOOKING_SCHEMA = "booking"



class Booking(Base):
    __tablename__ = "booking"
    __table_args__: ClassVar[dict] = {"schema": BOOKING_SCHEMA}

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
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    room_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    policy_type_applied: Mapped[CancellationPolicyType] = mapped_column(
        SAEnum(CancellationPolicyType, name="cancellation_policy_type", native_enum=True),
        nullable=False,
    )
    policy_hours_limit_applied: Mapped[int | None] = mapped_column(nullable=True)
    policy_refund_percent_applied: Mapped[int | None] = mapped_column(nullable=True)
    inventory_released: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    confirmation_payment_intent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, default=None
    )
    guests_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Per-night price breakdown captured at cart creation. Authoritative for the
    # booking's total. Shape: [{"day": "YYYY-MM-DD", "price": "140.00",
    # "original_price": "150.00" | null}, ...]. Null on legacy carts created
    # before the variable-pricing rollout.
    nightly_breakdown: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    # Standardised additional charges captured at cart creation so every client
    # surface (search/detail/cart/payment) shows the same total. Computed from
    # subtotal × shared.pricing constants. Default 0 covers legacy rows that
    # predate the column.
    taxes: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    service_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    guests: Mapped[list["Guest"]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    items: Mapped[list["BookingItem"]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"
    __table_args__: ClassVar[dict] = {"schema": BOOKING_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{BOOKING_SCHEMA}.booking.id"),
        nullable=False,
    )
    from_status: Mapped[BookingStatus | None] = mapped_column(
        SAEnum(BookingStatus, name="booking_status", native_enum=True, create_type=False),
        nullable=True,
    )
    to_status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="booking_status", native_enum=True, create_type=False),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(nullable=False)


def new_status_history_row(
    booking_id: uuid.UUID,
    *,
    from_status: BookingStatus | None,
    to_status: BookingStatus,
    reason: str | None = None,
    changed_by: uuid.UUID | None = None,
) -> BookingStatusHistory:
    """Construct a history row with id + naive UTC timestamp filled in."""
    return BookingStatusHistory(
        id=uuid.uuid4(),
        booking_id=booking_id,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        changed_by=changed_by,
        changed_at=datetime.now(UTC).replace(tzinfo=None),
    )


class Guest(Base):
    __tablename__ = "guest"
    __table_args__: ClassVar[dict] = {"schema": BOOKING_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{BOOKING_SCHEMA}.booking.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    booking: Mapped[Booking] = relationship(back_populates="guests")


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
