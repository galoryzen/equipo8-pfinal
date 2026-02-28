import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import engine
from .routes.holds import router as holds_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Catalog Service", lifespan=lifespan)
app.include_router(holds_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "catalog"}
