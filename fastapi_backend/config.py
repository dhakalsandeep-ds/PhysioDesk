from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    CORS_ORIGINS: List[str] = ["http://localhost:300", "http://localhost", "http://127.0.0.1"]

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"  
    )


   @field_validator("CORS_ORIGINS", mode="before")
   @classmethod
   def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    return v

settings = Settings()

