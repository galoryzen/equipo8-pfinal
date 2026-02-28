from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/experimento2"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    CATALOG_SERVICE_URL: str = "http://localhost:8001"
    CATALOG_TIMEOUT_SECONDS: float = 0.5

    model_config = {"env_prefix": ""}


settings = Settings()
