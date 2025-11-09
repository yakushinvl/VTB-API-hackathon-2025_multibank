from fastapi import APIRouter
from app.api.v1.endpoints import auth, accounts, transactions, banks, products, ai, subscription

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(banks.router, prefix="/banks", tags=["banks"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(subscription.router, prefix="/subscription", tags=["subscription"])

