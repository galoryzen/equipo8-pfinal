from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AUTH_SERVICE_URL: str = "http://thub-auth:8000/api/v1/auth"
    CATALOG_SERVICE_URL: str = "http://thub-catalog:8000/api/v1/catalog"
    SERVICE_NAME: str = "booking"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "booking"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Catalog coordination for inventory holds (SCRUM-123 backend foundation)
    CATALOG_SERVICE_URL: str = "http://thub-catalog:8000"
    CATALOG_HTTP_TIMEOUT_SECONDS: float = 3.0

    # Background worker — expires CART and reconciles unreleased inventory holds
    WORKER_ENABLED: bool = True
    WORKER_EXPIRE_INTERVAL_SECONDS: int = 60

    model_config = {"env_prefix": "BOOKING_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
