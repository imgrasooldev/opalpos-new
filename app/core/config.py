from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    PROJECT_NAME: str = "FastAPI Boilerplate"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database — default is an out-of-the-box async SQLite file.
    # For Postgres use: postgresql+asyncpg://user:pass@localhost:5432/dbname
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # File uploads
    UPLOAD_DIR: str = "uploads"          # folder on disk where files are saved
    STATIC_URL_PREFIX: str = "/static"   # public URL prefix for uploaded files
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5 MB


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
