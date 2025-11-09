from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://finaggregator:finaggregator@localhost:5432/finaggregator"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Bank APIs
    VBANK_API_URL: str = os.getenv("VBANK_API_URL", "")
    VBANK_CLIENT_ID: str = os.getenv("VBANK_CLIENT_ID", "team200")
    VBANK_CLIENT_SECRET: str = os.getenv("VBANK_CLIENT_SECRET", "")
    
    ABANK_API_URL: str = os.getenv("ABANK_API_URL", "")
    ABANK_CLIENT_ID: str = os.getenv("ABANK_CLIENT_ID", "team200")
    ABANK_CLIENT_SECRET: str = os.getenv("ABANK_CLIENT_SECRET", "")
    
    SBANK_API_URL: str = os.getenv("SBANK_API_URL", "")
    SBANK_CLIENT_ID: str = os.getenv("SBANK_CLIENT_ID", "team200")
    SBANK_CLIENT_SECRET: str = os.getenv("SBANK_CLIENT_SECRET", "")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Subscription
    PREMIUM_PRICE: float = 999.0  # рублей в месяц
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

