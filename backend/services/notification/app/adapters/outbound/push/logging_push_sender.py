import logging
import uuid
from typing import Any

from app.application.ports.outbound.push_sender import PushSender

logger = logging.getLogger(__name__)


class LoggingPushSender(PushSender):
    """Dev-only push sender: logs and returns synthetic ids.

    Used in local docker-compose so we never hit Expo's API from
    developer machines unless explicitly switched on.
    """

    async def send(
        self,
        *,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[str]:
        ids: list[str] = []
        for token in tokens:
            message_id = f"local-push-{uuid.uuid4()}"
            logger.info(
                "push sent (logging backend) token=%s title=%s body=%s message_id=%s data=%s",
                token[:12],
                title,
                body,
                message_id,
                data or {},
            )
            ids.append(message_id)
        return ids
