import enum
import uuid
from datetime import datetime
from typing import ClassVar

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class NotificationChannel(str, enum.Enum):
    EMAIL = "EMAIL"
    PUSH = "PUSH"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class DevicePlatform(str, enum.Enum):
    IOS = "IOS"
    ANDROID = "ANDROID"
    WEB = "WEB"


BOOKING_CONFIRMED_TYPE = "BOOKING_CONFIRMED"
BOOKING_REJECTED_TYPE = "BOOKING_REJECTED"

NOTIFICATIONS_SCHEMA = "notifications"


class Base(DeclarativeBase):
    pass


class Notification(Base):
    __tablename__ = "notification"
    __table_args__: ClassVar[tuple] = (
        UniqueConstraint("event_id", "channel", name="uq_notification_event_channel"),
        {"schema": NOTIFICATIONS_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, name="notification_channel", native_enum=True),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        SAEnum(NotificationStatus, name="notification_status", native_enum=True),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    to_email: Mapped[str | None] = mapped_column(String, nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


class DeviceToken(Base):
    __tablename__ = "device_token"
    __table_args__: ClassVar[dict] = {"schema": NOTIFICATIONS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    # Stored as VARCHAR in 01-init.sql — keep it a free-form string so DB
    # constraints aren't enforced by SQLAlchemy enums (the API validates).
    platform: Mapped[str] = mapped_column(String, nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
