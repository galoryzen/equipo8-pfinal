from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass
class UserContact:
    id: UUID
    full_name: str
    email: str


class UserContactClient(ABC):
    @abstractmethod
    async def get_contact(self, user_id: UUID) -> UserContact:
        """Fetch full name + email for a user. Raises if not found or upstream fails."""
