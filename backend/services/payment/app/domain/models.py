import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import ClassVar

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class PaymentIntentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class PaymentTransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


PAYMENTS_SCHEMA = "payments"


class Base(DeclarativeBase):
    pass


class PaymentIntent(Base):
    __tablename__ = "payment_intent"
    __table_args__: ClassVar[dict] = {"schema": PAYMENTS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[PaymentIntentStatus] = mapped_column(
        SAEnum(PaymentIntentStatus, name="payment_intent_status", native_enum=True),
        nullable=False,
    )
    mock_payment_token: Mapped[str] = mapped_column(String, nullable=False)
    start_idempotency_key: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    webhook_signing_secret: Mapped[str] = mapped_column(String, nullable=False)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)


class PaymentAttempt(Base):
    __tablename__ = "payment_attempt"
    __table_args__: ClassVar[dict] = {"schema": PAYMENTS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    payment_intent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    outcome: Mapped[str] = mapped_column(String, nullable=False)
    detail: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


class Payment(Base):
    __tablename__ = "payment"
    __table_args__: ClassVar[dict] = {"schema": PAYMENTS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[PaymentTransactionStatus] = mapped_column(
        SAEnum(PaymentTransactionStatus, name="payment_status", native_enum=True),
        nullable=False,
    )
    authorized_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    captured_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    payment_token: Mapped[str | None] = mapped_column(String, nullable=True)
    provider_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
