import uuid
from abc import ABC, abstractmethod

from app.domain.models import User


class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Get user by id."""

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""

    @abstractmethod
    async def get_hotel_id_by_user_id(self, user_id: uuid.UUID) -> uuid.UUID | None:
        """Return active hotel id for a hotel user, if available."""

    @abstractmethod
    async def check_user_exists(self, email: str) -> bool:
        """Check if a user with the given email exists."""

    @abstractmethod
    async def create_user(self, user: User) -> User:
        """Persist a new user and return the saved instance."""

    @abstractmethod
    async def hotel_exists_and_active(self, hotel_id: uuid.UUID) -> bool:
        """True if a hotel row exists with status ACTIVE."""

    @abstractmethod
    async def agency_exists_and_active(self, agency_id: uuid.UUID) -> bool:
        """True if an agency row exists with status ACTIVE."""

    @abstractmethod
    async def create_hotel_partner_user(self, user: User, hotel_id: uuid.UUID) -> User:
        """Insert user and hotel_user link in one transaction."""

    @abstractmethod
    async def create_agency_partner_user(self, user: User, agency_id: uuid.UUID) -> User:
        """Insert user and agency_user link in one transaction."""
