from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"server_settings": {"search_path": f"{settings.DB_SCHEMA}, public"}},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def check_db() -> bool:
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return True
