from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/codesage'
    jwt_secret: str = 'dev_insecure_secret_change_me'
    jwt_expires_minutes: int = 60 * 24 * 7
    client_url: str = 'http://localhost:5173'
    gemini_api_key: str = ''
    gemini_text_model: str = 'gemini-2.5-flash'
    gemini_embed_model: str = 'gemini-embedding-001'
    gemini_embed_dim: int = 768
    piston_url: str = 'https://emkc.org/api/v2/piston'
    ai_enabled: bool = True
    vector_backend: str = 'memory'
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')


@lru_cache
def get_settings() -> Settings:
    return Settings()
