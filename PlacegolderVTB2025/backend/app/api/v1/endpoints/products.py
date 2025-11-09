from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db.base import get_db
from app.db.models import (
    ProductRecommendation, 
    Account, 
    AccountType, 
    BankConnection,
    User,
    SubscriptionTier
)
from app.core.security import get_current_user_id
from app.services.bank_adapter import get_bank_adapter
from app.core.config import settings

router = APIRouter()


class ProductRecommendationResponse(BaseModel):
    id: int
    product_type: str
    bank_name: str
    product_name: str
    description: Optional[str]
    interest_rate: Optional[float]
    cashback_rate: Optional[float]
    conditions: Optional[dict]
    is_user_has: bool

    class Config:
        from_attributes = True


@router.get("/recommendations", response_model=List[ProductRecommendationResponse])
async def get_product_recommendations(
    product_type: Optional[AccountType] = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение рекомендаций по продуктам"""
    # Получение всех продуктов из банков
    all_products = []
    
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    # Получение счетов пользователя для определения имеющихся продуктов
    accounts = db.query(Account).filter(
        Account.bank_connection_id.in_([conn.id for conn in connections])
    ).all()
    
    user_account_types = {acc.account_type for acc in accounts}
    user_bank_names = {acc.bank_name for acc in accounts if acc.bank_name}
    
    # Получение продуктов из всех банков
    from app.db.models import Bank
    banks = db.query(Bank).filter(Bank.is_active == True).all()
    
    for bank in banks:
        adapter = get_bank_adapter(bank.name.lower())
        if adapter:
            try:
                products = await adapter.get_products()
                for product in products:
                    # Фильтрация по типу продукта
                    if product_type:
                        prod_type_str = product.get("type", "").lower()
                        if product_type.value not in prod_type_str:
                            continue
                    
                    # Определение типа продукта
                    prod_type_str = product.get("type", "debit").lower()
                    prod_type = AccountType.DEBIT
                    if "savings" in prod_type_str or "накопительный" in prod_type_str:
                        prod_type = AccountType.SAVINGS
                    elif "deposit" in prod_type_str or "вклад" in prod_type_str:
                        prod_type = AccountType.DEPOSIT
                    elif "credit" in prod_type_str or "кредит" in prod_type_str:
                        prod_type = AccountType.CREDIT
                    
                    # Проверка наличия у пользователя
                    is_user_has = (
                        prod_type in user_account_types and 
                        bank.name in user_bank_names
                    )
                    
                    all_products.append({
                        "product_type": prod_type.value,
                        "bank_name": bank.name,
                        "product_name": product.get("name", "Unknown"),
                        "description": product.get("description"),
                        "interest_rate": product.get("interest_rate"),
                        "cashback_rate": product.get("cashback_rate"),
                        "conditions": product.get("conditions", {}),
                        "is_user_has": is_user_has
                    })
            except Exception as e:
                print(f"Error fetching products from {bank.name}: {e}")
                continue
    
    # Сортировка: сначала продукты, которых нет у пользователя
    all_products.sort(key=lambda x: (x["is_user_has"], -x.get("cashback_rate", 0) or -x.get("interest_rate", 0)))
    
    return all_products


@router.get("/cashback-suggestions")
async def get_cashback_suggestions(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение предложений по кэшбэку"""
    # Получение транзакций пользователя для анализа трат
    from app.db.models import Transaction
    from app.api.v1.endpoints.transactions import get_transactions
    
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    accounts = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids)).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return {"suggestions": []}
    
    # Получение транзакций за последние 30 дней
    from datetime import datetime, timedelta
    from_date = datetime.utcnow() - timedelta(days=30)
    
    transactions = db.query(Transaction).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.transaction_date >= from_date
    ).all()
    
    # Анализ трат по категориям
    category_spending = {}
    for trans in transactions:
        if trans.amount < 0:
            category = trans.category or "Другое"
            amount = abs(trans.amount)
            category_spending[category] = category_spending.get(category, 0) + amount
    
    # Получение продуктов с кэшбэком
    from app.db.models import Bank
    banks = db.query(Bank).filter(Bank.is_active == True).all()
    
    cashback_products = []
    for bank in banks:
        adapter = get_bank_adapter(bank.name.lower())
        if adapter:
            try:
                products = await adapter.get_products()
                for product in products:
                    cashback_rate = product.get("cashback_rate")
                    if cashback_rate and cashback_rate > 0:
                        cashback_products.append({
                            "bank_name": bank.name,
                            "product_name": product.get("name", "Unknown"),
                            "cashback_rate": cashback_rate,
                            "conditions": product.get("conditions", {})
                        })
            except Exception as e:
                print(f"Error fetching products from {bank.name}: {e}")
                continue
    
    # Сортировка по кэшбэку
    cashback_products.sort(key=lambda x: x["cashback_rate"], reverse=True)
    
    return {
        "category_spending": category_spending,
        "suggestions": cashback_products[:5]  # Топ-5 предложений
    }

