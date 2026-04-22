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

    # Background worker — expires CART and reconciles unreleased inventory holds.
    # These flags only take effect in the worker process (app/worker.py).
    # Defaults False so the API never starts background work by accident.
    SCHEDULER_ENABLED: bool = False
    CONSUMER_ENABLED: bool = False
    WORKER_EXPIRE_INTERVAL_SECONDS: int = 60

    # Event bus (Paso 4: consumer of PaymentAuthorized + PaymentFailed)
    EVENT_BUS_BACKEND: str = "logging"
    RABBITMQ_URL: str | None = None
    EVENTBRIDGE_BUS_NAME: str | None = None
    EVENTBRIDGE_REGION: str | None = None

    PAYMENT_RESULT_QUEUE: str = "booking.payment-result"

    model_config = {"env_prefix": "BOOKING_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
