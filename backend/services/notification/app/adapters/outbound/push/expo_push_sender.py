import logging
from typing import Any

import httpx

from app.application.ports.outbound.push_sender import PushSender

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class ExpoPushSenderError(Exception):
    """Raised when the Expo push API rejects the request as a whole."""


class ExpoPushSender(PushSender):
    """Send push notifications via the Expo Push API.

    Expo accepts unauthenticated requests at low rate; pass
    `access_token` to use the Enhanced Security mode.
    """

    def __init__(self, http_client: httpx.AsyncClient, access_token: str | None = None):
        self._http = http_client
        self._access_token = access_token or None

    async def send(
        self,
        *,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[str]:
        if not tokens:
            return []

        messages = [{"to": t, "title": title, "body": body, "sound": "default", "data": data or {}} for t in tokens]
        headers = {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
        }
        if self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"

        resp = await self._http.post(EXPO_PUSH_URL, json=messages, headers=headers)
        if resp.status_code >= 400:
            logger.error("expo push request failed status=%s body=%s", resp.status_code, resp.text)
            raise ExpoPushSenderError(f"Expo push API returned {resp.status_code}")

        payload = resp.json()
        tickets = payload.get("data", [])
        ids: list[str] = []
        for token, ticket in zip(tokens, tickets, strict=False):
            if ticket.get("status") == "ok":
                ids.append(ticket.get("id", ""))
            else:
                # Per-message error (e.g. DeviceNotRegistered) — log and append empty id
                # so the caller can see the count line up with the tokens list.
                logger.warning(
                    "expo push ticket error token=%s message=%s details=%s",
                    token[:12],
                    ticket.get("message"),
                    ticket.get("details"),
                )
                ids.append("")
        return ids
