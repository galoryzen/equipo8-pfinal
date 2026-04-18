"""APScheduler embedded in the FastAPI process.

Runs two jobs on the same interval:
  - expire_carts: CART -> EXPIRED once hold_expires_at elapses, attempting an
    inline release_hold in Catalog.
  - reconcile_inventory: for CANCELLED/EXPIRED bookings still marked
    inventory_released=False, retry release_hold until Catalog accepts.

Each job opens a fresh AsyncSession (outside the HTTP request lifecycle) and
shares the long-lived httpx.AsyncClient configured at startup.
"""

import logging

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.application.use_cases.expire_cart_bookings import ExpireCartBookingsUseCase
from app.application.use_cases.reconcile_inventory_release import (
    ReconcileInventoryReleaseUseCase,
)
from app.config import settings

logger = logging.getLogger(__name__)


class BookingScheduler:
    def __init__(self, http_client: httpx.AsyncClient):
        self._http_client = http_client
        self._scheduler = AsyncIOScheduler()

    def start(self) -> None:
        interval = settings.WORKER_EXPIRE_INTERVAL_SECONDS
        self._scheduler.add_job(
            self._expire_carts_job,
            "interval",
            seconds=interval,
            id="expire_carts",
            max_instances=1,
            coalesce=True,
        )
        self._scheduler.add_job(
            self._reconcile_inventory_job,
            "interval",
            seconds=interval,
            id="reconcile_inventory",
            max_instances=1,
            coalesce=True,
        )
        self._scheduler.start()
        logger.info("BookingScheduler started with interval=%ss", interval)

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("BookingScheduler stopped")

    async def _expire_carts_job(self) -> None:
        try:
            async with async_session() as session:
                repo = SqlAlchemyBookingRepository(session)
                catalog = HttpCatalogClient(self._http_client, base_url=settings.CATALOG_SERVICE_URL)
                use_case = ExpireCartBookingsUseCase(repo, catalog)
                count = await use_case.execute()
                if count:
                    logger.info("expire_carts: transitioned %d CART -> EXPIRED", count)
        except Exception:
            # Never let a job exception kill the scheduler thread.
            logger.exception("expire_carts job failed")

    async def _reconcile_inventory_job(self) -> None:
        try:
            async with async_session() as session:
                repo = SqlAlchemyBookingRepository(session)
                catalog = HttpCatalogClient(self._http_client, base_url=settings.CATALOG_SERVICE_URL)
                use_case = ReconcileInventoryReleaseUseCase(repo, catalog)
                count = await use_case.execute()
                if count:
                    logger.info("reconcile_inventory: released %d pending holds", count)
        except Exception:
            logger.exception("reconcile_inventory job failed")
