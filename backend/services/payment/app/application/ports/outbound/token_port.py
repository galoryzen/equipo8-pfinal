from abc import ABC, abstractmethod


class TokenPort(ABC):
    @abstractmethod
    def decode_access_token(self, token: str) -> dict | None:
        """Return JWT payload or None if invalid."""
