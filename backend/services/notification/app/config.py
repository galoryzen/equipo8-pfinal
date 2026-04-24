from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "notification"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "notifications"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False

    # Event consumer (worker reads events from here).
    # Local: rabbitmq. AWS: sqs.
    EVENT_CONSUMER_BACKEND: str = "logging"
    RABBITMQ_URL: str | None = None
    BOOKING_CONFIRMED_QUEUE: str = "notification.booking-confirmed"
    EVENT_QUEUE_URL: str | None = None
    AWS_REGION: str | None = None

    # Email sender.
    # Local: logging (no real emails). AWS: ses.
    EMAIL_SENDER_BACKEND: str = "logging"
    SES_FROM_ADDRESS: str = "noreply@travelhub.galoryzen.xyz"

    # Internal service-to-service calls (auth + catalog enrichment).
    AUTH_SERVICE_URL: str = "http://thub-auth:8000"
    CATALOG_SERVICE_URL: str = "http://thub-catalog:8000"
    HTTP_CLIENT_TIMEOUT_SECONDS: float = 3.0
    INTERNAL_SERVICE_TOKEN: str = ""

    model_config = {"env_prefix": "NOTIFICATION_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
