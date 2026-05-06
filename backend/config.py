"""
config.py
---------
Centralised application settings loaded from environment variables.
Uses pydantic-settings so Docker Compose can inject values without hardcoding.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── PostgreSQL (+ TimescaleDB) ──────────────────────────────────────
    POSTGRES_DSN: str = "postgresql://neondb_owner:npg_iK7mcJRt6INM@ep-young-bird-apciatap-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

    # ── MongoDB ─────────────────────────────────────────────────────────
    MONGO_URI: str = "mongodb://mongo:27017"
    MONGO_DB_NAME: str = "ims"

    # ── Redis ───────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

