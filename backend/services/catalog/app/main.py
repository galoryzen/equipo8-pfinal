from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.dependencies import (
    close_cache,
    init_cache,
    set_booking_http_client,
)
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.inbound.api.inventory import router as inventory_router
from app.adapters.inbound.api.manager import router as manager_router
from app.adapters.inbound.api.properties import router as properties_router
from app.adapters.outbound.db.session import engine
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_cache()
    booking_client = httpx.AsyncClient(
        base_url=settings.BOOKING_SERVICE_URL, timeout=5.0
    )
    set_booking_http_client(booking_client)
    try:
        yield
    finally:
        await close_cache()
        await booking_client.aclose()
        set_booking_http_client(None)
        await engine.dispose()


app = FastAPI(title="Catalog Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health_router, prefix="/api/v1/catalog")
app.include_router(properties_router, prefix="/api/v1/catalog")
app.include_router(inventory_router, prefix="/api/v1/catalog")
app.include_router(manager_router, prefix="/api/v1/catalog")
