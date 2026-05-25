from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().with_name('.env'),
        env_file_encoding='utf-8',
        extra='ignore',
    )

    app_name: str = 'WaterFlow API'
    app_env: str = 'development'
    host: str = '0.0.0.0'
    port: int = 8000
    api_prefix: str = '/api/v1'
    database_url: str
    cors_origins: str = 'http://localhost:5173,http://localhost:5174'
    seed_demo_data: bool = True

    @property
    def parsed_cors_origins(self) -> list[str]:
        value = self.cors_origins.strip()
        if value == '*':
            return ['*']

        return [origin.strip() for origin in value.split(',') if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
