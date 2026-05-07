from abc import ABC, abstractmethod


class TokenPort(ABC):
    @abstractmethod
    def decode_access_token(self, token: str) -> dict | None:
        """Decode and verify a token. Returns claims dict or None if invalid."""
