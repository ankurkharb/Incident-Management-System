"""
config.py
---------
Centralised application settings loaded from environment variables.
Uses pydantic-settings so Docker Compose can inject values without hardcoding.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── PostgreSQL (+ TimescaleDB) ──────────────────────────────────────
    POSTGRES_DSN: str = "postgresql://postgres:postgres@postgres:5432/ims"

    # ── MongoDB ─────────────────────────────────────────────────────────
    MONGO_URI: str = "mongodb://mongo:27017"
    MONGO_DB_NAME: str = "ims"

    # ── Redis ───────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
