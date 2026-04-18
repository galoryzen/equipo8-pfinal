"""Smoke test for BookingScheduler — verifies jobs register and shutdown is clean.

End-to-end behavior (expire_carts + reconcile_inventory against real Postgres)
is covered by the docker-compose verification in the plan.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.adapters.inbound.scheduler import BookingScheduler


@pytest.mark.asyncio
async def test_start_registers_two_jobs_then_shutdown_is_clean():
    client = httpx.AsyncClient()
    scheduler = BookingScheduler(client)
    try:
        scheduler.start()
        job_ids = {j.id for j in scheduler._scheduler.get_jobs()}
        assert job_ids == {"expire_carts", "reconcile_inventory"}
    finally:
        scheduler.shutdown()
        await client.aclose()


@pytest.mark.asyncio
async def test_expire_carts_job_swallows_use_case_exceptions():
    """Job errors must never crash the scheduler."""
    client = httpx.AsyncClient()
    scheduler = BookingScheduler(client)
    with patch("app.adapters.inbound.scheduler.ExpireCartBookingsUseCase") as mock_uc_cls:
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = RuntimeError("boom")
        mock_uc_cls.return_value = mock_uc

        # Must not raise.
        await scheduler._expire_carts_job()

    await client.aclose()


@pytest.mark.asyncio
async def test_reconcile_inventory_job_swallows_use_case_exceptions():
    client = httpx.AsyncClient()
    scheduler = BookingScheduler(client)
    with patch("app.adapters.inbound.scheduler.ReconcileInventoryReleaseUseCase") as mock_uc_cls:
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = RuntimeError("boom")
        mock_uc_cls.return_value = mock_uc

        await scheduler._reconcile_inventory_job()

    await client.aclose()
