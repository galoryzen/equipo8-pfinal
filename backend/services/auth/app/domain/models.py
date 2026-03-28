import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import LargeBinary


class UserRole(enum.Enum):
    TRAVELER = "TRAVELER"
    ADMIN = "ADMIN"

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", create_type=False), nullable=False)
    country_code: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    password: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
