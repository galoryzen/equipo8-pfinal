from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PAYMENT_SUCCEEDED

from app.adapters.inbound.events.handlers import make_payment_result_handler


def _make_session_factory(session):
    factory = MagicMock()
    factory.return_value.__aenter__ = AsyncMock(return_value=session)
    factory.return_value.__aexit__ = AsyncMock(return_value=None)
    return factory


@pytest.mark.asyncio
async def test_handle_commits_on_success():
    session = AsyncMock()
    session_factory = _make_session_factory(session)

    envelope = DomainEventEnvelope(event_type=PAYMENT_SUCCEEDED, payload={})

    with patch(
        "app.adapters.inbound.events.handlers.HandlePaymentResultUseCase"
    ) as uc_cls:
        uc_instance = AsyncMock()
        uc_cls.return_value = uc_instance
        handler = make_payment_result_handler(session_factory)
        await handler(envelope)

    uc_instance.execute.assert_awaited_once_with(envelope)
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_rollback_on_failure():
    session = AsyncMock()
    session_factory = _make_session_factory(session)

    envelope = DomainEventEnvelope(event_type=PAYMENT_SUCCEEDED, payload={})

    with patch(
        "app.adapters.inbound.events.handlers.HandlePaymentResultUseCase"
    ) as uc_cls:
        uc_instance = AsyncMock()
        uc_instance.execute = AsyncMock(side_effect=RuntimeError("boom"))
        uc_cls.return_value = uc_instance
        handler = make_payment_result_handler(session_factory)

        with pytest.raises(RuntimeError, match="boom"):
            await handler(envelope)

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
