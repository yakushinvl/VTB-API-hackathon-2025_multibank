"""Скрипт для инициализации базы данных"""
from sqlalchemy.orm import Session
from app.db.base import SessionLocal, engine, Base
from app.db.models import Bank
from app.core.config import settings


def init_db():
    """Инициализация базы данных"""
    # Создание таблиц
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Создание записей банков
        banks_data = [
            {
                "name": "VBank",
                "api_url": settings.VBANK_API_URL,
                "client_id": settings.VBANK_CLIENT_ID,
                "client_secret": settings.VBANK_CLIENT_SECRET,
                "is_active": True
            },
            {
                "name": "ABank",
                "api_url": settings.ABANK_API_URL,
                "client_id": settings.ABANK_CLIENT_ID,
                "client_secret": settings.ABANK_CLIENT_SECRET,
                "is_active": True
            },
            {
                "name": "SBank",
                "api_url": settings.SBANK_API_URL,
                "client_id": settings.SBANK_CLIENT_ID,
                "client_secret": settings.SBANK_CLIENT_SECRET,
                "is_active": True
            },
        ]
        
        for bank_data in banks_data:
            if not bank_data["api_url"]:
                continue  # Пропускаем банки без URL
            
            existing_bank = db.query(Bank).filter(Bank.name == bank_data["name"]).first()
            if not existing_bank:
                bank = Bank(**bank_data)
                db.add(bank)
        
        db.commit()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

