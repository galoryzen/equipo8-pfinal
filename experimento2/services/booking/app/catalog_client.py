import logging
from datetime import date
from uuid import UUID

import httpx

from .config import settings

logger = logging.getLogger("booking.catalog_client")

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=settings.CATALOG_SERVICE_URL,
            timeout=httpx.Timeout(settings.CATALOG_TIMEOUT_SECONDS, connect=2.0),
        )
    return _client


async def close_client():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


async def create_hold(
    room_type_id: UUID,
    checkin: date,
    checkout: date,
    quantity: int,
) -> dict:
    client = get_client()
    payload = {
        "room_type_id": str(room_type_id),
        "checkin": checkin.isoformat(),
        "checkout": checkout.isoformat(),
        "quantity": quantity,
    }
    response = await client.post("/api/catalog/holds", json=payload)
    response.raise_for_status()
    return response.json()
