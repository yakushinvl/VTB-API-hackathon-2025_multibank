from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.db.base import get_db
from app.db.models import User, SubscriptionTier
from app.core.security import get_current_user_id
from app.core.config import settings

router = APIRouter()


class SubscriptionResponse(BaseModel):
    tier: str
    expires_at: Optional[datetime]
    price: float
    features: list

    class Config:
        from_attributes = True


class UpgradeRequest(BaseModel):
    payment_method: str = "card"  # В реальном приложении здесь была бы интеграция с платежной системой


@router.get("/", response_model=SubscriptionResponse)
async def get_subscription(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение информации о подписке"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    features = []
    if user.subscription_tier == SubscriptionTier.PREMIUM:
        features = [
            "ИИ ассистент для анализа трат",
            "Персонализированные рекомендации",
            "Помощник по выбору кэшбэка",
            "Продвинутая аналитика",
            "Экспорт данных"
        ]
    else:
        features = [
            "Агрегация счетов",
            "История трат",
            "Базовая аналитика"
        ]
    
    return SubscriptionResponse(
        tier=user.subscription_tier.value,
        expires_at=user.subscription_expires_at,
        price=settings.PREMIUM_PRICE if user.subscription_tier == SubscriptionTier.PREMIUM else 0,
        features=features
    )


@router.post("/upgrade")
async def upgrade_subscription(
    request: UpgradeRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Обновление подписки до премиум"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.subscription_tier == SubscriptionTier.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has premium subscription"
        )
    
    # В реальном приложении здесь была бы обработка платежа
    # Для демонстрации просто обновляем подписку
    
    user.subscription_tier = SubscriptionTier.PREMIUM
    user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
    db.commit()
    
    return {
        "message": "Subscription upgraded successfully",
        "tier": "premium",
        "expires_at": user.subscription_expires_at
    }


@router.post("/cancel")
async def cancel_subscription(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Отмена подписки"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.subscription_tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have active subscription"
        )
    
    # Отмена подписки (сохраняем до конца оплаченного периода)
    # В реальном приложении здесь была бы логика отмены платежа
    
    return {
        "message": "Subscription will be cancelled at the end of the current billing period",
        "expires_at": user.subscription_expires_at
    }

