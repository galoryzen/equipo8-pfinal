from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.device_token_repository import SqlAlchemyDeviceTokenRepository
from app.domain.models import DevicePlatform, DeviceToken


def _existing_row(token_value: str = "tok") -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=uuid4(),
        platform=DevicePlatform.IOS.value,
        token=token_value,
        is_active=False,
        created_at=now,
        updated_at=now,
    )


def _result_returning(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


@pytest.mark.asyncio
async def test_upsert_inserts_when_token_missing():
    session = AsyncMock()
    session.add = MagicMock()
    session.execute.return_value = _result_returning(None)

    repo = SqlAlchemyDeviceTokenRepository(session)
    user_id = uuid4()
    row = await repo.upsert_by_token(user_id=user_id, platform=DevicePlatform.ANDROID, token="newtok")

    session.add.assert_called_once()
    session.commit.assert_awaited_once()
    assert row.user_id == user_id
    assert row.platform == DevicePlatform.ANDROID.value
    assert row.token == "newtok"
    assert row.is_active is True


@pytest.mark.asyncio
async def test_upsert_reactivates_existing_token_and_reassigns_user():
    existing = _existing_row("tok-shared")
    session = AsyncMock()
    session.execute.return_value = _result_returning(existing)

    repo = SqlAlchemyDeviceTokenRepository(session)
    new_user = uuid4()
    row = await repo.upsert_by_token(user_id=new_user, platform=DevicePlatform.WEB, token="tok-shared")

    assert row is existing
    assert existing.user_id == new_user
    assert existing.platform == DevicePlatform.WEB.value
    assert existing.is_active is True
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_active_by_user_id_returns_scalars():
    rows = [_existing_row("a"), _existing_row("b")]
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = rows
    result.scalars.return_value = scalars
    session = AsyncMock()
    session.execute.return_value = result

    repo = SqlAlchemyDeviceTokenRepository(session)
    out = await repo.list_active_by_user_id(uuid4())

    assert out == rows


@pytest.mark.asyncio
async def test_deactivate_marks_existing_inactive():
    existing = _existing_row("tok")
    existing.is_active = True
    session = AsyncMock()
    session.execute.return_value = _result_returning(existing)

    repo = SqlAlchemyDeviceTokenRepository(session)
    await repo.deactivate_by_token("tok")

    assert existing.is_active is False
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_deactivate_is_noop_when_token_missing():
    session = AsyncMock()
    session.execute.return_value = _result_returning(None)

    repo = SqlAlchemyDeviceTokenRepository(session)
    await repo.deactivate_by_token("missing")

    session.commit.assert_not_awaited()
