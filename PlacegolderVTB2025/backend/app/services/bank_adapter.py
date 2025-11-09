from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import httpx
from app.core.config import settings


class BankAdapter(ABC):
    """Базовый адаптер для работы с банковскими API"""
    
    def __init__(self, api_url: str, client_id: str, client_secret: str):
        self.api_url = api_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
    
    async def get_access_token(self) -> str:
        """Получение access token для банка"""
        if self.access_token:
            return self.access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/auth/bank-token",
                params={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data.get("access_token")
            return self.access_token
    
    async def request_consent(
        self, 
        user_client_id: str, 
        permissions: List[str]
    ) -> Dict:
        """Запрос согласия на доступ к данным"""
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/account-consents/request",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "Content-Type": "application/json"
                },
                json={
                    "permissions": permissions,
                    "client_id": user_client_id
                }
            )
            response.raise_for_status()
            return response.json()
    
    @abstractmethod
    async def get_accounts(self, user_client_id: str, consent_id: str) -> List[Dict]:
        """Получение списка счетов"""
        pass
    
    @abstractmethod
    async def get_balances(self, user_client_id: str, consent_id: str, account_id: str) -> Dict:
        """Получение баланса счета"""
        pass
    
    @abstractmethod
    async def get_transactions(
        self, 
        user_client_id: str, 
        consent_id: str, 
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict]:
        """Получение транзакций"""
        pass
    
    @abstractmethod
    async def get_products(self) -> List[Dict]:
        """Получение продуктов банка"""
        pass


class VBankAdapter(BankAdapter):
    """Адаптер для VBank"""
    
    async def get_accounts(self, user_client_id: str, consent_id: str) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("accounts", [])
    
    async def get_balances(self, user_client_id: str, consent_id: str, account_id: str) -> Dict:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/balances",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_transactions(
        self, 
        user_client_id: str, 
        consent_id: str, 
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict]:
        token = await self.get_access_token()
        
        params = {"client_id": user_client_id}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/transactions",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params=params
            )
            response.raise_for_status()
            data = response.json()
            return data.get("transactions", [])
    
    async def get_products(self) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/products",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("products", [])


class ABankAdapter(BankAdapter):
    """Адаптер для ABank (Awesome Bank) - аналогичен VBank"""
    
    async def get_accounts(self, user_client_id: str, consent_id: str) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("accounts", [])
    
    async def get_balances(self, user_client_id: str, consent_id: str, account_id: str) -> Dict:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/balances",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_transactions(
        self, 
        user_client_id: str, 
        consent_id: str, 
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict]:
        token = await self.get_access_token()
        
        params = {"client_id": user_client_id}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/transactions",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params=params
            )
            response.raise_for_status()
            data = response.json()
            return data.get("transactions", [])
    
    async def get_products(self) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/products",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("products", [])


class SBankAdapter(BankAdapter):
    """Адаптер для SBank (Smart Bank) - аналогичен VBank"""
    
    async def get_accounts(self, user_client_id: str, consent_id: str) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("accounts", [])
    
    async def get_balances(self, user_client_id: str, consent_id: str, account_id: str) -> Dict:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/balances",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params={"client_id": user_client_id}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_transactions(
        self, 
        user_client_id: str, 
        consent_id: str, 
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict]:
        token = await self.get_access_token()
        
        params = {"client_id": user_client_id}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/accounts/{account_id}/transactions",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id,
                    "X-Consent-Id": consent_id
                },
                params=params
            )
            response.raise_for_status()
            data = response.json()
            return data.get("transactions", [])
    
    async def get_products(self) -> List[Dict]:
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/products",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Requesting-Bank": self.client_id
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("products", [])


def get_bank_adapter(bank_name: str) -> BankAdapter:
    """Фабрика для получения адаптера банка"""
    adapters = {
        "vbank": VBankAdapter(
            settings.VBANK_API_URL,
            settings.VBANK_CLIENT_ID,
            settings.VBANK_CLIENT_SECRET
        ),
        "abank": ABankAdapter(
            settings.ABANK_API_URL,
            settings.ABANK_CLIENT_ID,
            settings.ABANK_CLIENT_SECRET
        ),
        "sbank": SBankAdapter(
            settings.SBANK_API_URL,
            settings.SBANK_CLIENT_ID,
            settings.SBANK_CLIENT_SECRET
        ),
    }
    return adapters.get(bank_name.lower())

