from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db.base import get_db
from app.db.models import Account, AccountType, BankConnection
from app.core.security import get_current_user_id

router = APIRouter()


class AccountResponse(BaseModel):
    id: int
    bank_account_id: str
    account_type: str
    name: Optional[str]
    currency: str
    balance: float
    available_balance: float
    bank_name: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class AccountSummary(BaseModel):
    total_balance: float
    accounts_by_type: dict
    accounts_count: int


@router.get("/", response_model=List[AccountResponse])
async def get_accounts(
    account_type: Optional[AccountType] = Query(None, description="Filter by account type"),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение списка счетов пользователя"""
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    
    # Получение счетов
    query = db.query(Account).filter(Account.bank_connection_id.in_(connection_ids))
    
    if account_type:
        query = query.filter(Account.account_type == account_type)
    
    accounts = query.filter(Account.is_active == True).all()
    return accounts


@router.get("/summary", response_model=AccountSummary)
async def get_accounts_summary(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение сводки по счетам"""
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    
    # Получение всех счетов
    accounts = db.query(Account).filter(
        Account.bank_connection_id.in_(connection_ids),
        Account.is_active == True
    ).all()
    
    # Расчет суммы
    total_balance = sum(acc.balance for acc in accounts)
    
    # Группировка по типам
    accounts_by_type = {}
    for acc in accounts:
        acc_type = acc.account_type.value
        if acc_type not in accounts_by_type:
            accounts_by_type[acc_type] = {
                "count": 0,
                "total_balance": 0.0
            }
        accounts_by_type[acc_type]["count"] += 1
        accounts_by_type[acc_type]["total_balance"] += acc.balance
    
    return AccountSummary(
        total_balance=total_balance,
        accounts_by_type=accounts_by_type,
        accounts_count=len(accounts)
    )


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение информации о счете"""
    # Получение всех подключений пользователя
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    connection_ids = [conn.id for conn in connections]
    
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.bank_connection_id.in_(connection_ids)
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return account

