from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.base import get_db
from app.db.models import Transaction, Account, BankConnection
from app.core.security import get_current_user_id

router = APIRouter()


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    amount: float
    currency: str
    description: Optional[str]
    category: Optional[str]
    merchant: Optional[str]
    transaction_date: datetime
    bank_name: Optional[str]
    account_name: Optional[str]

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_income: float
    total_expenses: float
    transactions_count: int
    expenses_by_category: dict


@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    account_id: Optional[int] = Query(None, description="Filter by account ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    from_date: Optional[datetime] = Query(None, description="Filter from date"),
    to_date: Optional[datetime] = Query(None, description="Filter to date"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение списка транзакций"""
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    
    # Получение всех счетов пользователя
    accounts_query = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids))
    if account_id:
        accounts_query = accounts_query.filter(Account.id == account_id)
    
    accounts = accounts_query.all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return []
    
    # Получение транзакций
    query = db.query(Transaction).filter(Transaction.account_id.in_(account_ids))
    
    if category:
        query = query.filter(Transaction.category == category)
    
    if from_date:
        query = query.filter(Transaction.transaction_date >= from_date)
    
    if to_date:
        query = query.filter(Transaction.transaction_date <= to_date)
    
    transactions = query.order_by(Transaction.transaction_date.desc()).offset(offset).limit(limit).all()
    
    # Формирование ответа с дополнительными данными
    result = []
    for trans in transactions:
        account = db.query(Account).filter(Account.id == trans.account_id).first()
        result.append({
            "id": trans.id,
            "account_id": trans.account_id,
            "amount": trans.amount,
            "currency": trans.currency,
            "description": trans.description,
            "category": trans.category,
            "merchant": trans.merchant,
            "transaction_date": trans.transaction_date,
            "bank_name": account.bank_name if account else None,
            "account_name": account.name if account else None
        })
    
    return result


@router.get("/summary", response_model=TransactionSummary)
async def get_transactions_summary(
    from_date: Optional[datetime] = Query(None, description="Filter from date"),
    to_date: Optional[datetime] = Query(None, description="Filter to date"),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение сводки по транзакциям"""
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    
    # Получение всех счетов пользователя
    accounts = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids)).all()
    account_ids = [acc.id for acc in accounts]
    
    if not account_ids:
        return TransactionSummary(
            total_income=0.0,
            total_expenses=0.0,
            transactions_count=0,
            expenses_by_category={}
        )
    
    # Получение транзакций
    query = db.query(Transaction).filter(Transaction.account_id.in_(account_ids))
    
    if from_date:
        query = query.filter(Transaction.transaction_date >= from_date)
    else:
        # По умолчанию последние 30 дней
        from_date = datetime.utcnow() - timedelta(days=30)
        query = query.filter(Transaction.transaction_date >= from_date)
    
    if to_date:
        query = query.filter(Transaction.transaction_date <= to_date)
    
    transactions = query.all()
    
    # Расчет статистики
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = abs(sum(t.amount for t in transactions if t.amount < 0))
    
    expenses_by_category = {}
    for trans in transactions:
        if trans.amount < 0:
            category = trans.category or "Другое"
            amount = abs(trans.amount)
            expenses_by_category[category] = expenses_by_category.get(category, 0) + amount
    
    return TransactionSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        transactions_count=len(transactions),
        expenses_by_category=expenses_by_category
    )

