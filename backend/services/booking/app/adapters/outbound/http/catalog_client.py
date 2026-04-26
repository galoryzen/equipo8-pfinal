import logging
from datetime import date
from decimal import Decimal
from uuid import UUID

import httpx

from app.application.exceptions import (
    CatalogUnavailableError,
    InventoryUnavailableError,
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.ports.outbound.catalog_pricing_port import (
    CatalogPricingPort,
    NightPrice,
    PricingResult,
)

logger = logging.getLogger(__name__)


class HttpCatalogClient(CatalogInventoryPort, CatalogPricingPort):
    """HTTP adapter calling Catalog inventory and pricing endpoints."""

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

    async def get_pricing(
        self,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> PricingResult:
        url = f"{self._base_url}/api/v1/catalog/rate-plans/{rate_plan_id}/pricing"
        params = {
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
        }
        try:
            response = await self._client.get(url, params=params)
        except httpx.HTTPError as exc:
            logger.warning("Catalog pricing failed with network error: %s", exc)
            raise CatalogUnavailableError(str(exc)) from exc

        if response.status_code == 404:
            raise RatePlanNotFoundError(f"Catalog: rate plan {rate_plan_id} not found")
        if response.status_code == 409:
            raise RateUnavailableError(response.text)
        if response.status_code == 422:
            raise RateCurrencyMismatchError(response.text)
        if response.status_code != 200:
            logger.warning(
                "Catalog pricing unexpected status %s: %s",
                response.status_code,
                response.text,
            )
            raise CatalogUnavailableError(
                f"Catalog pricing returned {response.status_code}"
            )

        body = response.json()
        nights = [
            NightPrice(
                day=date.fromisoformat(n["day"]),
                price=Decimal(str(n["price"])),
                original_price=(
                    Decimal(str(n["original_price"]))
                    if n.get("original_price") is not None
                    else None
                ),
            )
            for n in body["nights"]
        ]
        original_subtotal = body.get("original_subtotal")
        return PricingResult(
            rate_plan_id=UUID(body["rate_plan_id"]),
            currency_code=body["currency_code"],
            nights=nights,
            subtotal=Decimal(str(body["subtotal"])),
            original_subtotal=(
                Decimal(str(original_subtotal)) if original_subtotal is not None else None
            ),
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
