from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.dependencies import (
    get_configured_event_publisher,
    set_payment_http_client,
)
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.inbound.api.payment_intents import router as payment_intents_router
from app.adapters.outbound.db.session import engine
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS)
    set_payment_http_client(client)
    try:
        yield
    finally:
        set_payment_http_client(None)
        await client.aclose()
        await get_configured_event_publisher().close()
        await engine.dispose()


app = FastAPI(title="Payment Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(health_router, prefix="/api/v1/payment")
app.include_router(payment_intents_router, prefix="/api/v1/payment")
