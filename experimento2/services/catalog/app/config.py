from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/experimento2"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    model_config = {"env_prefix": ""}


settings = Settings()
