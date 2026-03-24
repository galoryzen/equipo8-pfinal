from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "catalog"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "catalog"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False

    model_config = {"env_prefix": "CATALOG_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
