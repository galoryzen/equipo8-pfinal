import logging
import uuid

from app.application.ports.outbound.email_sender import EmailSender

logger = logging.getLogger(__name__)


class LoggingEmailSender(EmailSender):
    """Dev-only email sender: logs the message and returns a fake provider id.

    Used in local docker-compose so we never hit SES from developer machines.
    """

    def __init__(self, from_address: str):
        self._from = from_address

    async def send(self, *, to: str, subject: str, html: str, text: str) -> str:
        message_id = f"local-{uuid.uuid4()}"
        logger.info(
            "email sent (logging backend) from=%s to=%s subject=%s message_id=%s text_len=%d html_len=%d",
            self._from,
            to,
            subject,
            message_id,
            len(text),
            len(html),
        )
        return message_id
