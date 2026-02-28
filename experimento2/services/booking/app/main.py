import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import catalog_client
from .database import engine
from .routes.bookings import router as bookings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await catalog_client.close_client()
    await engine.dispose()


app = FastAPI(title="Booking Service", lifespan=lifespan)
app.include_router(bookings_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "booking"}
