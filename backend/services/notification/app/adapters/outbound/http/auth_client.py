import logging
from uuid import UUID

import httpx

from app.application.exceptions import NotificationEnrichmentError
from app.application.ports.outbound.user_contact_client import UserContact, UserContactClient

logger = logging.getLogger(__name__)


class HttpAuthClient(UserContactClient):
    def __init__(self, client: httpx.AsyncClient, base_url: str, internal_token: str):
        self._client = client
        self._base_url = base_url.rstrip("/")
        self._internal_token = internal_token

    async def get_contact(self, user_id: UUID) -> UserContact:
        url = f"{self._base_url}/internal/users/{user_id}/contact"
        headers = {"X-Internal-Token": self._internal_token}
        try:
            response = await self._client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("auth contact lookup failed with network error: %s", exc)
            raise NotificationEnrichmentError(f"auth unavailable: {exc}") from exc

        if response.status_code == 200:
            body = response.json()
            return UserContact(id=UUID(body["id"]), full_name=body["full_name"], email=body["email"])
        if response.status_code == 404:
            raise NotificationEnrichmentError(f"user {user_id} not found in auth")
        logger.warning(
            "auth contact lookup unexpected status %s: %s",
            response.status_code,
            response.text,
        )
        raise NotificationEnrichmentError(f"auth returned {response.status_code}")
