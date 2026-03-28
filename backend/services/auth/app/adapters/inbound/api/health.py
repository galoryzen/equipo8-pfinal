from fastapi import APIRouter, Response

from app.adapters.outbound.db.session import check_db
from app.config import settings

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "service": settings.SERVICE_NAME}


@router.get("/health/db")
async def health_db(response: Response):
    try:
        await check_db()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        response.status_code = 503
        return {"status": "error", "database": "disconnected", "detail": str(e)}
