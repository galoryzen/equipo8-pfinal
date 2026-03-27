from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.dependencies import close_cache, init_cache
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.inbound.api.properties import router as properties_router
from app.adapters.outbound.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_cache()
    yield
    await close_cache()
    await engine.dispose()


app = FastAPI(title="Catalog Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health_router, prefix="/api/v1/catalog")
app.include_router(properties_router, prefix="/api/v1/catalog")
