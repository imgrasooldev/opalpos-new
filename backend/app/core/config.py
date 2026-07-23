from functools import lru_cache
from typing import Literal

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
    PROJECT_NAME: str = "OpalPos"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    APP_ENV: Literal["local", "staging", "production"] = "local"
    BASE_URL: str = "http://localhost:8000"

    # Database — default is an out-of-the-box async SQLite file.
    # For Postgres use: postgresql+asyncpg://user:pass@localhost:5432/dbname
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    # Sync DSN for Alembic / management scripts: postgresql+psycopg://...
    DATABASE_URL_SYNC: str = ""
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"
    # POS terminal offline reh sakta hai, isliye mobile token lamba
    MOBILE_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    # Laravel se migrate kiye users ke $2y$ bcrypt hashes accept karo
    ALLOW_LEGACY_LARAVEL_HASH: bool = True

    # CORS — mobile app / web origins
    CORS_ORIGINS: list[str] = ["*"]

    # Redis (cache, rate limit, celery broker, websocket pub/sub)
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    CACHE_TTL_SECONDS: int = 300

    # Rate limiting ko Redis chahiye. Local dev (SQLite, bina Redis) mein
    # default off — warna har request Redis connect karne ki koshish karti.
    RATE_LIMIT_ENABLED: bool = False

    # File uploads
    UPLOAD_DIR: str = "uploads"          # folder on disk where files are saved
    STATIC_URL_PREFIX: str = "/static"   # public URL prefix for uploaded files
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5 MB

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    # --- integrations (sab optional; business settings se override hote hain) ---
    STRIPE_SECRET_KEY: str | None = None
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    AUTHORIZENET_LOGIN_ID: str | None = None
    AUTHORIZENET_TRANSACTION_KEY: str | None = None
    AUTHORIZENET_SANDBOX: bool = True
    PESAPAL_CONSUMER_KEY: str | None = None
    PESAPAL_CONSUMER_SECRET: str | None = None

    TWILIO_SID: str | None = None
    TWILIO_TOKEN: str | None = None
    VONAGE_API_KEY: str | None = None
    VONAGE_API_SECRET: str | None = None

    FCM_CREDENTIALS_FILE: str | None = None   # firebase service-account JSON path

    # Storage / backup
    STORAGE_DRIVER: Literal["local", "s3", "dropbox"] = "local"
    AWS_S3_BUCKET: str | None = None
    DROPBOX_TOKEN: str | None = None

    # Observability
    SENTRY_DSN: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
