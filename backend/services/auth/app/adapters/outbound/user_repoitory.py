from abc import ABC, abstractmethod
from app.domain.models import User


class UserRepository(ABC):
    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """User by email."""
        raise NotImplementedError("Subclass must implement abstract method get_by_email()")

    @abstractmethod
    async def check_user_exists(self, email: str) -> bool:
        """Check if user exists."""
        raise NotImplementedError("Subclass must implement abstract method check_user_exists()")

    @abstractmethod
    async def create_user(self, user: User) -> User:
        """Create user."""
        raise NotImplementedError("Subclass must implement abstract method create_user()")