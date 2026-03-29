from abc import ABC, abstractmethod

from app.domain.models import User


class UserRepository(ABC):
    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""

    @abstractmethod
    async def check_user_exists(self, email: str) -> bool:
        """Check if a user with the given email exists."""

    @abstractmethod
    async def create_user(self, user: User) -> User:
        """Persist a new user and return the saved instance."""
