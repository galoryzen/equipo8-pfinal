from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "auth"
    DATABASE_URL: str = "postgresql+asyncpg://travelhub:travelhub_dev@postgres:5432/travelhub"
    DB_SCHEMA: str = "users"
    REDIS_URL: str = "redis://redis:6379/0"
    DEBUG: bool = False
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    # Shared secret for POST /admin/partner-users (empty = endpoint disabled with 503)
    PARTNER_ADMIN_SECRET: str = ""
    # Shared secret for internal service-to-service endpoints mounted at /internal/*.
    # Empty = endpoint refuses all requests with 503.
    INTERNAL_SERVICE_TOKEN: str = ""

    model_config = {"env_prefix": "AUTH_",
                    "env_file": ".env", "extra": "ignore"}


settings = Settings()
