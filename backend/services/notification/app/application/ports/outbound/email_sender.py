from abc import ABC, abstractmethod


class EmailSender(ABC):
    @abstractmethod
    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
    ) -> str:
        """Send a transactional email and return the provider's message id."""
