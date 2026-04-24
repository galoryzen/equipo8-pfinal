import logging
from uuid import UUID

import httpx

from app.application.exceptions import NotificationEnrichmentError
from app.application.ports.outbound.property_client import PropertyClient, PropertySummary

logger = logging.getLogger(__name__)


class HttpCatalogClient(PropertyClient):
    def __init__(self, client: httpx.AsyncClient, base_url: str, internal_token: str):
        self._client = client
        self._base_url = base_url.rstrip("/")
        self._internal_token = internal_token

    async def get_summary(self, property_id: UUID) -> PropertySummary:
        url = f"{self._base_url}/internal/properties/{property_id}/summary"
        headers = {"X-Internal-Token": self._internal_token}
        try:
            response = await self._client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("catalog summary lookup failed with network error: %s", exc)
            raise NotificationEnrichmentError(f"catalog unavailable: {exc}") from exc

        if response.status_code == 200:
            body = response.json()
            return PropertySummary(
                id=UUID(body["id"]),
                name=body["name"],
                city_name=body["city_name"],
                country=body["country"],
                image_url=body.get("image_url"),
            )
        if response.status_code == 404:
            raise NotificationEnrichmentError(f"property {property_id} not found in catalog")
        logger.warning(
            "catalog summary lookup unexpected status %s: %s",
            response.status_code,
            response.text,
        )
        raise NotificationEnrichmentError(f"catalog returned {response.status_code}")
