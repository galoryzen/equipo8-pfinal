from abc import ABC, abstractmethod
from typing import Any


class PushSender(ABC):
    @abstractmethod
    async def send(
        self,
        *,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[str]:
        """Send a push to one-or-more device tokens.

        Returns the per-message provider ids (in the same order as `tokens`).
        Should raise on transport-level failures; per-message provider
        rejections are logged but do not stop the batch.
        """
