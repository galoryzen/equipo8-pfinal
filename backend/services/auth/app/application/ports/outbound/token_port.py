from abc import ABC, abstractmethod


class TokenPort(ABC):
    @abstractmethod
    def create_access_token(
        self,
        subject: str,
        email: str,
        role: str,
        full_name: str,
        hotel_id: str | None = None,
    ) -> str:
        """Create a signed access token."""

    @abstractmethod
    def decode_access_token(self, token: str) -> dict | None:
        """Decode and verify a token. Returns claims dict or None if invalid."""
