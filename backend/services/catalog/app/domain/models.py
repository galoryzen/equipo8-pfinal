import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class PropertyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class RoomTypeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class CancellationPolicyType(str, enum.Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    NON_REFUNDABLE = "NON_REFUNDABLE"


class PolicyCategory(str, enum.Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"
    PETS = "PETS"
    SMOKING = "SMOKING"
    CHILDREN = "CHILDREN"
    GENERAL = "GENERAL"


class DiscountType(str, enum.Enum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"


class Base(DeclarativeBase):
    pass


property_amenity_table = Table(
    "property_amenity",
    Base.metadata,
    Column("property_id", UUID(as_uuid=True),
           ForeignKey("property.id"), primary_key=True),
    Column("amenity_id", UUID(as_uuid=True),
           ForeignKey("amenity.id"), primary_key=True),
)

room_type_amenity_table = Table(
    "room_type_amenity",
    Base.metadata,
    Column("room_type_id", UUID(as_uuid=True),
           ForeignKey("room_type.id"), primary_key=True),
    Column("amenity_id", UUID(as_uuid=True),
           ForeignKey("amenity.id"), primary_key=True),
)


class City(Base):
    __tablename__ = "city"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dane_code: Mapped[str | None] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str | None] = mapped_column(String)
    country: Mapped[str] = mapped_column(String, nullable=False)
    continent: Mapped[str | None] = mapped_column(String)
    image_url: Mapped[str | None] = mapped_column(Text)


class CancellationPolicy(Base):
    __tablename__ = "cancellation_policy"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[CancellationPolicyType] = mapped_column(
        SAEnum(CancellationPolicyType, name="cancellation_policy_type",
               create_type=False, schema="public"),
        nullable=False,
    )
    hours_limit: Mapped[int | None] = mapped_column(Integer)
    refund_percent: Mapped[int | None] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Amenity(Base):
    __tablename__ = "amenity"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


class Property(Base):
    __tablename__ = "property"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    hotel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("city.id"), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    status: Mapped[PropertyStatus] = mapped_column(
        SAEnum(PropertyStatus, name="property_status",
               create_type=False, schema="public"),
        nullable=False,
        default=PropertyStatus.ACTIVE,
    )
    rating_avg: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), default=0)
    review_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0)
    popularity_score: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=0)
    default_cancellation_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cancellation_policy.id")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # relationships
    city: Mapped["City"] = relationship(lazy="joined")
    default_cancellation_policy: Mapped["CancellationPolicy | None"] = relationship(
        lazy="joined")
    images: Mapped[list["PropertyImage"]] = relationship(
        back_populates="property", order_by="PropertyImage.display_order"
    )
    amenities: Mapped[list["Amenity"]] = relationship(
        secondary=property_amenity_table, lazy="selectin")
    policies: Mapped[list["PropertyPolicy"]] = relationship(
        back_populates="property")
    room_types: Mapped[list["RoomType"]] = relationship(
        back_populates="property")


class PropertyImage(Base):
    __tablename__ = "property_image"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("property.id"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[str | None] = mapped_column(String)
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    property: Mapped["Property"] = relationship(back_populates="images")


class PropertyPolicy(Base):
    __tablename__ = "property_policy"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("property.id"), nullable=False)
    category: Mapped[PolicyCategory] = mapped_column(
        SAEnum(PolicyCategory, name="policy_category",
               create_type=False, schema="public"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    property: Mapped["Property"] = relationship(back_populates="policies")


class RoomType(Base):
    __tablename__ = "room_type"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("property.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RoomTypeStatus] = mapped_column(
        SAEnum(RoomTypeStatus, name="room_type_status",
               create_type=False, schema="public"),
        nullable=False,
        default=RoomTypeStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    property: Mapped["Property"] = relationship(back_populates="room_types")
    amenities: Mapped[list["Amenity"]] = relationship(
        secondary=room_type_amenity_table, lazy="selectin")
    rate_plans: Mapped[list["RatePlan"]] = relationship(
        back_populates="room_type")
    images: Mapped[list["RoomTypeImage"]] = relationship(
        back_populates="room_type")


class RatePlan(Base):
    __tablename__ = "rate_plan"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    room_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("room_type.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True)
    cancellation_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cancellation_policy.id")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    room_type: Mapped["RoomType"] = relationship(back_populates="rate_plans")
    cancellation_policy: Mapped["CancellationPolicy | None"] = relationship(
        lazy="joined")
    rate_calendar: Mapped[list["RateCalendar"]
                          ] = relationship(back_populates="rate_plan")
    promotions: Mapped[list["Promotion"]] = relationship(
        back_populates="rate_plan")


class RateCalendar(Base):
    __tablename__ = "rate_calendar"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_plan.id"), nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    price_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    rate_plan: Mapped["RatePlan"] = relationship(
        back_populates="rate_calendar")


class RoomTypeImage(Base):
    __tablename__ = "room_type_image"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    room_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("room_type.id"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[str | None] = mapped_column(String)
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    room_type: Mapped["RoomType"] = relationship(back_populates="images")


class InventoryCalendar(Base):
    __tablename__ = "inventory_calendar"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    room_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("room_type.id"), nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    available_units: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Promotion(Base):
    __tablename__ = "promotion"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    rate_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rate_plan.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        SAEnum(DiscountType, name="discount_type",
               create_type=False, schema="public"),
        nullable=False,
    )
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    rate_plan: Mapped["RatePlan"] = relationship(back_populates="promotions")


class Review(Base):
    __tablename__ = "review"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False)
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("property.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
