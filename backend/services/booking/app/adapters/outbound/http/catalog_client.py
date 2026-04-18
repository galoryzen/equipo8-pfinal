import logging
from datetime import date
from uuid import UUID

import httpx

from app.application.exceptions import CatalogUnavailableError, InventoryUnavailableError
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort

logger = logging.getLogger(__name__)


class HttpCatalogClient(CatalogInventoryPort):
    """HTTP adapter calling Catalog inventory endpoints."""

    def __init__(self, client: httpx.AsyncClient, base_url: str):
        self._client = client
        self._base_url = base_url.rstrip("/")

    async def create_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        await self._post(
            "/api/v1/catalog/inventory/holds",
            room_type_id,
            checkin,
            checkout,
        )

    async def release_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        await self._post(
            "/api/v1/catalog/inventory/holds/release",
            room_type_id,
            checkin,
            checkout,
        )

    async def _post(
        self,
        path: str,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        url = f"{self._base_url}{path}"
        payload = {
            "room_type_id": str(room_type_id),
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
        }
        try:
            response = await self._client.post(url, json=payload)
        except httpx.HTTPError as exc:
            logger.warning("Catalog %s failed with network error: %s", path, exc)
            raise CatalogUnavailableError(str(exc)) from exc

        if response.status_code == 204:
            return
        if response.status_code == 409:
            raise InventoryUnavailableError(f"Catalog rejected hold for room_type={room_type_id}: {response.text}")

        logger.warning(
            "Catalog %s unexpected status %s: %s",
            path,
            response.status_code,
            response.text,
        )
        raise CatalogUnavailableError(f"Catalog {path} returned {response.status_code}")
