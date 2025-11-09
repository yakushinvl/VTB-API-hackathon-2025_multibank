from typing import List, Dict, Optional
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
from app.core.config import settings
from app.db.models import Transaction, Account, AccountType
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json


class AIAssistant:
    """ИИ ассистент для анализа трат и рекомендаций"""
    
    def __init__(self):
        if settings.OPENAI_API_KEY and HAS_OPENAI:
            openai.api_key = settings.OPENAI_API_KEY
    
    async def analyze_spending(
        self, 
        transactions: List[Transaction],
        accounts: List[Account]
    ) -> Dict:
        """Анализ трат пользователя"""
        if not settings.OPENAI_API_KEY or not HAS_OPENAI:
            return self._fallback_analysis(transactions, accounts)
        
        # Подготовка данных для анализа
        spending_by_category = {}
        total_spending = 0
        monthly_spending = {}
        
        for transaction in transactions:
            if transaction.amount < 0:  # Расходы
                category = transaction.category or "Другое"
                amount = abs(transaction.amount)
                spending_by_category[category] = spending_by_category.get(category, 0) + amount
                total_spending += amount
                
                month_key = transaction.transaction_date.strftime("%Y-%m")
                monthly_spending[month_key] = monthly_spending.get(month_key, 0) + amount
        
        # Формирование запроса к ИИ
        prompt = f"""
Проанализируй финансовые траты пользователя и предоставь рекомендации:

Данные о тратах по категориям:
{json.dumps(spending_by_category, ensure_ascii=False, indent=2)}

Месячные траты:
{json.dumps(monthly_spending, ensure_ascii=False, indent=2)}

Общая сумма трат: {total_spending} RUB

Аккаунты пользователя:
{json.dumps([{"type": acc.account_type.value, "balance": acc.balance, "bank": acc.bank_name} for acc in accounts], ensure_ascii=False, indent=2)}

Предоставь анализ в формате JSON:
{{
    "summary": "Краткое резюме трат",
    "top_categories": ["категория1", "категория2", "категория3"],
    "recommendations": [
        "Рекомендация 1",
        "Рекомендация 2",
        "Рекомендация 3"
    ],
    "savings_opportunities": [
        "Возможность экономии 1",
        "Возможность экономии 2"
    ],
    "cashback_suggestions": [
        "Предложение по кэшбэку 1",
        "Предложение по кэшбэку 2"
    ]
}}
"""
        
        try:
            if HAS_OPENAI:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Ты финансовый консультант, который помогает пользователям оптимизировать свои расходы."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1000
                )
                
                result = json.loads(response.choices[0].message.content)
                return result
            else:
                return self._fallback_analysis(transactions, accounts)
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return self._fallback_analysis(transactions, accounts)
    
    def _fallback_analysis(self, transactions: List[Transaction], accounts: List[Account]) -> Dict:
        """Резервный анализ без ИИ"""
        spending_by_category = {}
        total_spending = 0
        
        for transaction in transactions:
            if transaction.amount < 0:
                category = transaction.category or "Другое"
                amount = abs(transaction.amount)
                spending_by_category[category] = spending_by_category.get(category, 0) + amount
                total_spending += amount
        
        top_categories = sorted(
            spending_by_category.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        
        return {
            "summary": f"Общие траты: {total_spending:.2f} RUB",
            "top_categories": [cat[0] for cat in top_categories],
            "recommendations": [
                "Рассмотрите возможность использования карт с кэшбэком для основных категорий трат",
                "Создайте резервный фонд на отдельном накопительном счете",
                "Отслеживайте регулярные подписки и отменяйте неиспользуемые"
            ],
            "savings_opportunities": [
                "Оптимизация трат на топ-категории",
                "Использование скидок и акций"
            ],
            "cashback_suggestions": [
                "Выберите карту с максимальным кэшбэком для ваших основных категорий трат",
                "Рассмотрите карты с повышенным кэшбэком в определенных категориях"
            ]
        }
    
    async def get_cashback_recommendation(
        self,
        transactions: List[Transaction],
        available_products: List[Dict]
    ) -> Dict:
        """Рекомендация по выбору кэшбэка"""
        if not settings.OPENAI_API_KEY or not HAS_OPENAI:
            return self._fallback_cashback_recommendation(transactions, available_products)
        
        # Анализ трат по категориям
        category_spending = {}
        for transaction in transactions:
            if transaction.amount < 0:
                category = transaction.category or "Другое"
                amount = abs(transaction.amount)
                category_spending[category] = category_spending.get(category, 0) + amount
        
        prompt = f"""
Проанализируй траты пользователя и предложи лучшую карту с кэшбэком:

Траты по категориям:
{json.dumps(category_spending, ensure_ascii=False, indent=2)}

Доступные продукты:
{json.dumps(available_products, ensure_ascii=False, indent=2)}

Предоставь рекомендацию в формате JSON:
{{
    "recommended_product": {{
        "name": "Название продукта",
        "bank": "Название банка",
        "cashback_rate": 0.05,
        "reason": "Причина рекомендации"
    }},
    "estimated_savings": 1000,
    "alternative_products": [
        {{
            "name": "Альтернативный продукт",
            "bank": "Банк",
            "cashback_rate": 0.03
        }}
    ]
}}
"""
        
        try:
            if HAS_OPENAI:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Ты эксперт по банковским продуктам и кэшбэку."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=800
                )
                
                result = json.loads(response.choices[0].message.content)
                return result
            else:
                return self._fallback_cashback_recommendation(transactions, available_products)
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return self._fallback_cashback_recommendation(transactions, available_products)
    
    def _fallback_cashback_recommendation(
        self,
        transactions: List[Transaction],
        available_products: List[Dict]
    ) -> Dict:
        """Резервная рекомендация по кэшбэку"""
        # Простая логика: найти продукт с максимальным кэшбэком
        best_product = None
        max_cashback = 0
        
        for product in available_products:
            cashback = product.get("cashback_rate", 0)
            if cashback > max_cashback:
                max_cashback = cashback
                best_product = product
        
        return {
            "recommended_product": best_product or {
                "name": "Не найдено",
                "bank": "Не найдено",
                "cashback_rate": 0,
                "reason": "Нет доступных продуктов"
            },
            "estimated_savings": 0,
            "alternative_products": []
        }
    
    async def chat(
        self,
        message: str,
        user_context: Optional[Dict] = None
    ) -> str:
        """Чат с ИИ ассистентом"""
        if not settings.OPENAI_API_KEY or not HAS_OPENAI:
            return "ИИ ассистент временно недоступен. Пожалуйста, обратитесь в поддержку."
        
        context = ""
        if user_context:
            context = f"\nКонтекст пользователя: {json.dumps(user_context, ensure_ascii=False)}"
        
        try:
            if HAS_OPENAI:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Ты финансовый консультант, помогающий пользователям управлять своими финансами. Отвечай кратко и по делу."},
                        {"role": "user", "content": f"{message}{context}"}
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                
                return response.choices[0].message.content
            else:
                return "ИИ ассистент временно недоступен. Пожалуйста, обратитесь в поддержку."
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return "Извините, произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже."

