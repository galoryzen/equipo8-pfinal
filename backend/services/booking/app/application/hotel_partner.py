"""Hotel partner context resolved via Auth service (same source as list-by-hotel flows)."""

from uuid import UUID

import httpx

from app.config import settings


async def resolve_hotel_id_for_user(user_id: str | UUID) -> UUID:
    try:
        uid = UUID(str(user_id))
    except (TypeError, ValueError) as e:
        raise ValueError("user_id invalido para resolver hotel") from e

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.AUTH_SERVICE_URL}/users/{uid}")

            if resp.status_code != 200:
                raise ValueError("No se pudo resolver hotel_id para el usuario")

            payload = resp.json()
            hotel_id = payload.get("hotel_id")
            if not hotel_id:
                raise ValueError("hotel_id es requerido para este rol")
            return UUID(str(hotel_id))
    except ValueError:
        raise
    except Exception as e:
        raise ValueError("No se pudo resolver hotel_id para el usuario") from e
