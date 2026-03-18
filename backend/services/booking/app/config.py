from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "booking"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "booking"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False

    model_config = {"env_prefix": "BOOKING_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
