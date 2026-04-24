from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "payment"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "payments"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False

    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    BOOKING_SERVICE_URL: str = "http://localhost:8003"
    HTTP_CLIENT_TIMEOUT_SECONDS: float = 10.0

    # Event bus — publisher and consumer backends are independent.
    # In AWS the worker uses EVENT_CONSUMER_BACKEND=sqs + EVENT_PUBLISHER_BACKEND=eventbridge.
    EVENT_PUBLISHER_BACKEND: str = "logging"
    EVENT_CONSUMER_BACKEND: str = "logging"
    RABBITMQ_URL: str | None = None
    EVENTBRIDGE_BUS_NAME: str | None = None
    EVENTBRIDGE_REGION: str | None = None

    PAYMENT_REQUESTED_QUEUE: str = "payment.payment-requested"

    # AWS SQS worker inbox (used when EVENT_CONSUMER_BACKEND=sqs).
    AWS_REGION: str | None = None
    EVENT_QUEUE_URL: str | None = None

    model_config = {"env_prefix": "PAYMENT_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
