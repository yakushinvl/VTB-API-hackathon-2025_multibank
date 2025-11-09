from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.db.base import get_db
from app.db.models import (
    User, 
    Transaction, 
    Account, 
    BankConnection,
    SubscriptionTier,
    AIChatMessage
)
from app.core.security import get_current_user_id
from app.services.ai_assistant import AIAssistant

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    message_id: int


class SpendingAnalysisResponse(BaseModel):
    summary: str
    top_categories: list
    recommendations: list
    savings_opportunities: list
    cashback_suggestions: list


@router.post("/analyze-spending", response_model=SpendingAnalysisResponse)
async def analyze_spending(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Анализ трат пользователя (только для премиум пользователей)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверка подписки
    if user.subscription_tier != SubscriptionTier.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required"
        )
    
    # Получение транзакций
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    accounts = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids)).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return SpendingAnalysisResponse(
            summary="Нет данных для анализа",
            top_categories=[],
            recommendations=[],
            savings_opportunities=[],
            cashback_suggestions=[]
        )
    
    # Получение транзакций за последние 90 дней
    from_date = datetime.utcnow() - timedelta(days=90)
    transactions = db.query(Transaction).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.transaction_date >= from_date
    ).all()
    
    # Анализ через ИИ
    assistant = AIAssistant()
    analysis = await assistant.analyze_spending(transactions, accounts)
    
    return SpendingAnalysisResponse(**analysis)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Чат с ИИ ассистентом (только для премиум пользователей)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверка подписки
    if user.subscription_tier != SubscriptionTier.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required"
        )
    
    # Получение контекста пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    accounts = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids)).all()
    
    user_context = {
        "accounts_count": len(accounts),
        "total_balance": sum(acc.balance for acc in accounts),
        "banks": list(set(acc.bank_name for acc in accounts if acc.bank_name))
    }
    
    # Получение ответа от ИИ
    assistant = AIAssistant()
    response = await assistant.chat(request.message, user_context)
    
    # Сохранение сообщения
    chat_message = AIChatMessage(
        user_id=user_id,
        message=request.message,
        response=response
    )
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    
    return ChatResponse(
        response=response,
        message_id=chat_message.id
    )


@router.get("/cashback-recommendation")
async def get_cashback_recommendation(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение рекомендации по кэшбэку (только для премиум пользователей)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверка подписки
    if user.subscription_tier != SubscriptionTier.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required"
        )
    
    # Получение транзакций
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    accounts = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids)).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return {"recommended_product": None, "estimated_savings": 0, "alternative_products": []}
    
    # Получение транзакций за последние 30 дней
    from_date = datetime.utcnow() - timedelta(days=30)
    transactions = db.query(Transaction).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.transaction_date >= from_date
    ).all()
    
    # Получение доступных продуктов
    from app.services.bank_adapter import get_bank_adapter
    from app.db.models import Bank
    banks = db.query(Bank).filter(Bank.is_active == True).all()
    
    available_products = []
    for bank in banks:
        adapter = get_bank_adapter(bank.name.lower())
        if adapter:
            try:
                products = await adapter.get_products()
                for product in products:
                    if product.get("cashback_rate"):
                        available_products.append(product)
            except Exception as e:
                print(f"Error fetching products from {bank.name}: {e}")
                continue
    
    # Получение рекомендации от ИИ
    assistant = AIAssistant()
    recommendation = await assistant.get_cashback_recommendation(transactions, available_products)
    
    return recommendation

