import asyncio
import logging
import signal

import httpx

from app.adapters.inbound.events.consumer_wiring import build_worker_consumer
from app.adapters.inbound.scheduler import BookingScheduler
from app.adapters.outbound.db.session import check_db, engine
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("booking.worker")


async def main() -> None:
    logger.info("Booking worker starting")
    await check_db()

    http_client = httpx.AsyncClient(timeout=settings.CATALOG_HTTP_TIMEOUT_SECONDS)

    scheduler: BookingScheduler | None = None
    if settings.SCHEDULER_ENABLED:
        scheduler = BookingScheduler(http_client)
        scheduler.start()

    consumer = build_worker_consumer() if settings.CONSUMER_ENABLED else None
    run_task: asyncio.Task | None = None

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()

    def _request_stop() -> None:
        logger.info("Shutdown signal received")
        stop.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _request_stop)

    if consumer is not None:
        run_task = asyncio.create_task(consumer.run())

    if scheduler is None and consumer is None:
        logger.warning(
            "Booking worker started with SCHEDULER_ENABLED=false and CONSUMER_ENABLED=false; "
            "nothing to do, waiting for shutdown signal"
        )

    try:
        await stop.wait()
    finally:
        logger.info("Shutting down")
        if scheduler is not None:
            scheduler.shutdown()
        if consumer is not None:
            await consumer.close()
        if run_task is not None:
            run_task.cancel()
            try:
                await run_task
            except asyncio.CancelledError:
                pass
        await http_client.aclose()
        await engine.dispose()
        logger.info("Booking worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
