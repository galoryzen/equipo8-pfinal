from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.bookings import router as bookings_router
from app.adapters.inbound.api.internal_payment import router as internal_payment_router
from app.adapters.inbound.api.dependencies import set_catalog_http_client
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.inbound.scheduler import BookingScheduler
from app.adapters.outbound.db.session import engine
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client = httpx.AsyncClient(timeout=settings.CATALOG_HTTP_TIMEOUT_SECONDS)
    set_catalog_http_client(http_client)

    scheduler: BookingScheduler | None = None
    if settings.WORKER_ENABLED:
        scheduler = BookingScheduler(http_client)
        scheduler.start()

    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown()
        await http_client.aclose()
        set_catalog_http_client(None)
        await engine.dispose()


app = FastAPI(title="Booking Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(health_router, prefix="/api/v1/booking")
app.include_router(bookings_router, prefix="/api/v1/booking")
app.include_router(internal_payment_router, prefix="/api/v1/booking")
