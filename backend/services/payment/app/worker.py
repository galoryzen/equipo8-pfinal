import asyncio
import logging
import signal

from app.adapters.inbound.events.consumer_wiring import build_worker_consumer
from app.adapters.outbound.db.session import check_db, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("payment.worker")


async def main() -> None:
    logger.info("Payment worker starting")
    await check_db()
    consumer = build_worker_consumer()

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()

    def _request_stop() -> None:
        logger.info("Shutdown signal received")
        stop.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _request_stop)

    def _on_task_done(task: asyncio.Task) -> None:
        if not task.cancelled() and task.exception() is not None:
            logger.error("Consumer task crashed", exc_info=task.exception())
            stop.set()

    run_task = asyncio.create_task(consumer.run())
    run_task.add_done_callback(_on_task_done)
    try:
        await stop.wait()
    finally:
        logger.info("Closing consumer")
        await consumer.close()
        run_task.cancel()
        try:
            await run_task
        except asyncio.CancelledError:
            pass
        await engine.dispose()
        logger.info("Payment worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
