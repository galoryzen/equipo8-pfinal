from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api import dependencies as deps
from app.adapters.inbound.api.device_tokens import router as device_tokens_router
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.outbound.db.session import engine
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    push_http = httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS)
    deps.set_push_http_client(push_http)
    try:
        yield
    finally:
        deps.set_push_http_client(None)
        await push_http.aclose()
        await engine.dispose()


app = FastAPI(title="Notification Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(health_router, prefix="/api/v1/notifications")
app.include_router(device_tokens_router, prefix="/api/v1/notifications")
