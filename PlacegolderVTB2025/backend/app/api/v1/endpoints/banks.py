from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db.base import get_db
from app.db.models import User, Bank, BankConnection, SubscriptionTier
from app.core.security import get_current_user_id
from app.services.bank_adapter import get_bank_adapter
from app.core.config import settings

router = APIRouter()


class BankConnectionCreate(BaseModel):
    bank_name: str
    user_client_id: str


class BankConnectionResponse(BaseModel):
    id: int
    bank_name: str
    client_id: str
    consent_id: Optional[str]
    is_active: bool
    last_sync_at: Optional[datetime]

    class Config:
        from_attributes = True


class BankResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[BankResponse])
async def get_available_banks(db: Session = Depends(get_db)):
    """Получение списка доступных банков"""
    banks = db.query(Bank).filter(Bank.is_active == True).all()
    return banks


@router.post("/connect", response_model=BankConnectionResponse, status_code=status.HTTP_201_CREATED)
async def connect_bank(
    connection_data: BankConnectionCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Подключение банка"""
    # Получение банка
    bank = db.query(Bank).filter(Bank.name.ilike(f"%{connection_data.bank_name}%")).first()
    if not bank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank not found"
        )
    
    # Проверка существующего подключения
    existing_connection = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.bank_id == bank.id,
        BankConnection.client_id == connection_data.user_client_id
    ).first()
    
    if existing_connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bank already connected"
        )
    
    # Получение адаптера банка
    adapter = get_bank_adapter(bank.name.lower())
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bank adapter not available"
        )
    
    # Запрос согласия
    try:
        consent_response = await adapter.request_consent(
            user_client_id=connection_data.user_client_id,
            permissions=["ReadAccountsDetail", "ReadBalances", "ReadTransactions"]
        )
        consent_id = consent_response.get("consent_id")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to request consent: {str(e)}"
        )
    
    # Создание подключения
    connection = BankConnection(
        user_id=user_id,
        bank_id=bank.id,
        client_id=connection_data.user_client_id,
        consent_id=consent_id,
        is_active=True
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    
    # Синхронизация счетов
    try:
        await sync_accounts(connection.id, db)
    except Exception as e:
        print(f"Error syncing accounts: {e}")
    
    return {
        "id": connection.id,
        "bank_name": bank.name,
        "client_id": connection.client_id,
        "consent_id": connection.consent_id,
        "is_active": connection.is_active,
        "last_sync_at": connection.last_sync_at
    }


@router.get("/connections", response_model=List[BankConnectionResponse])
async def get_connections(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение списка подключенных банков"""
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == user_id,
        BankConnection.is_active == True
    ).all()
    
    result = []
    for connection in connections:
        bank = db.query(Bank).filter(Bank.id == connection.bank_id).first()
        result.append({
            "id": connection.id,
            "bank_name": bank.name if bank else "Unknown",
            "client_id": connection.client_id,
            "consent_id": connection.consent_id,
            "is_active": connection.is_active,
            "last_sync_at": connection.last_sync_at
        })
    
    return result


@router.post("/{connection_id}/sync")
async def sync_bank_data(
    connection_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Синхронизация данных банка"""
    connection = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.user_id == user_id
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    bank = db.query(Bank).filter(Bank.id == connection.bank_id).first()
    adapter = get_bank_adapter(bank.name.lower())
    
    # Синхронизация счетов
    await sync_accounts(connection_id, db)
    
    # Синхронизация транзакций
    await sync_transactions(connection_id, db)
    
    # Обновление времени последней синхронизации
    connection.last_sync_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Sync completed"}


async def sync_accounts(connection_id: int, db: Session):
    """Синхронизация счетов"""
    connection = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not connection or not connection.consent_id:
        return
    
    bank = db.query(Bank).filter(Bank.id == connection.bank_id).first()
    adapter = get_bank_adapter(bank.name.lower())
    
    try:
        accounts_data = await adapter.get_accounts(
            user_client_id=connection.client_id,
            consent_id=connection.consent_id
        )
        
        from app.db.models import Account, AccountType
        
        for acc_data in accounts_data:
            # Проверка существования счета
            existing_account = db.query(Account).filter(
                Account.bank_connection_id == connection_id,
                Account.bank_account_id == acc_data.get("id")
            ).first()
            
            # Определение типа счета
            account_type_str = acc_data.get("type", "debit").lower()
            account_type = AccountType.DEBIT
            if "savings" in account_type_str or "накопительный" in account_type_str:
                account_type = AccountType.SAVINGS
            elif "deposit" in account_type_str or "вклад" in account_type_str:
                account_type = AccountType.DEPOSIT
            elif "credit" in account_type_str or "кредит" in account_type_str:
                account_type = AccountType.CREDIT
            
            # Получение баланса
            try:
                balance_data = await adapter.get_balances(
                    user_client_id=connection.client_id,
                    consent_id=connection.consent_id,
                    account_id=acc_data.get("id")
                )
                balance = balance_data.get("balance", 0.0)
                available_balance = balance_data.get("available_balance", balance)
            except:
                balance = acc_data.get("balance", 0.0)
                available_balance = balance
            
            if existing_account:
                # Обновление существующего счета
                existing_account.balance = balance
                existing_account.available_balance = available_balance
                existing_account.name = acc_data.get("name", existing_account.name)
                existing_account.is_active = True
            else:
                # Создание нового счета
                account = Account(
                    bank_connection_id=connection_id,
                    bank_account_id=acc_data.get("id"),
                    account_type=account_type,
                    name=acc_data.get("name", "Account"),
                    currency=acc_data.get("currency", "RUB"),
                    balance=balance,
                    available_balance=available_balance,
                    bank_name=bank.name,
                    is_active=True
                )
                db.add(account)
        
        db.commit()
    except Exception as e:
        print(f"Error syncing accounts: {e}")
        db.rollback()


async def sync_transactions(connection_id: int, db: Session):
    """Синхронизация транзакций"""
    connection = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not connection or not connection.consent_id:
        return
    
    bank = db.query(Bank).filter(Bank.id == connection.bank_id).first()
    adapter = get_bank_adapter(bank.name.lower())
    
    # Получение всех счетов подключения
    from app.db.models import Account, Transaction
    accounts = db.query(Account).filter(Account.bank_connection_id == connection_id).all()
    
    from app.services.categorizer import TransactionCategorizer
    categorizer = TransactionCategorizer()
    
    for account in accounts:
        try:
            transactions_data = await adapter.get_transactions(
                user_client_id=connection.client_id,
                consent_id=connection.consent_id,
                account_id=account.bank_account_id
            )
            
            for trans_data in transactions_data:
                # Проверка существования транзакции
                existing_transaction = db.query(Transaction).filter(
                    Transaction.account_id == account.id,
                    Transaction.bank_transaction_id == trans_data.get("id")
                ).first()
                
                if not existing_transaction:
                    # Категоризация
                    description = trans_data.get("description", "")
                    category = categorizer.categorize(description)
                    merchant = categorizer.extract_merchant(description)
                    
                    # Парсинг даты
                    from datetime import datetime
                    transaction_date = datetime.fromisoformat(
                        trans_data.get("transaction_date", datetime.utcnow().isoformat())
                    )
                    
                    transaction = Transaction(
                        user_id=connection.user_id,
                        account_id=account.id,
                        bank_transaction_id=trans_data.get("id"),
                        amount=trans_data.get("amount", 0.0),
                        currency=trans_data.get("currency", "RUB"),
                        description=description,
                        category=category,
                        merchant=merchant,
                        transaction_date=transaction_date
                    )
                    db.add(transaction)
            
            db.commit()
        except Exception as e:
            print(f"Error syncing transactions for account {account.id}: {e}")
            db.rollback()

