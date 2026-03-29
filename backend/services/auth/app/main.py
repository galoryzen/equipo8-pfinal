from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.dependencies import init_token_adapter
from app.adapters.inbound.api.error_handlers import register_error_handlers
from app.adapters.inbound.api.health import router as health_router
from app.adapters.inbound.api.login import router as login_router
from app.adapters.outbound.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_token_adapter()
    yield
    await engine.dispose()


app = FastAPI(title="Auth Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, # type: ignore
    allow_origins=["https://travelhub.galoryzen.xyz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health_router, prefix="/api/v1/auth")
app.include_router(login_router, prefix="/api/v1/auth")
