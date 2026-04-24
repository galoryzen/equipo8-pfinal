from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AUTH_SERVICE_URL: str = "http://thub-auth:8000/api/v1/auth"
    SERVICE_NAME: str = "booking"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "booking"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Catalog coordination for inventory holds (SCRUM-123 backend foundation)
    # Default = CloudMap hostname (AWS). Compose overrides to thub-catalog locally.
    CATALOG_SERVICE_URL: str = "http://catalog.services.local:8000"
    CATALOG_HTTP_TIMEOUT_SECONDS: float = 3.0

    # Background worker — expires CART and reconciles unreleased inventory holds.
    # These flags only take effect in the worker process (app/worker.py).
    # Defaults False so the API never starts background work by accident.
    SCHEDULER_ENABLED: bool = False
    CONSUMER_ENABLED: bool = False
    WORKER_EXPIRE_INTERVAL_SECONDS: int = 60

    # Event bus (Paso 4: consumer of PaymentSucceeded + PaymentFailed)
    # Split in two roles: API publishes, worker consumes. They can use
    # different transports (e.g. AWS worker = sqs consumer + eventbridge publisher
    # if booking ever publishes from the worker; today it only consumes).
    EVENT_PUBLISHER_BACKEND: str = "logging"
    EVENT_CONSUMER_BACKEND: str = "logging"
    RABBITMQ_URL: str | None = None
    EVENTBRIDGE_BUS_NAME: str | None = None
    EVENTBRIDGE_REGION: str | None = None

    PAYMENT_RESULT_QUEUE: str = "booking.payment-result"

    # AWS SQS worker inbox (used when EVENT_CONSUMER_BACKEND=sqs).
    AWS_REGION: str | None = None
    EVENT_QUEUE_URL: str | None = None

    model_config = {"env_prefix": "BOOKING_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
