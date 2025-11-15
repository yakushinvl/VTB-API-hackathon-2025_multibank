# Сводка изменений в API интеграции

## Проверка и исправление всех POST запросов к банковским API

### ✅ Исправления

1. **Создан централизованный модуль для работы с API** (`server/utils/bankApiHelper.js`)
   - Единая точка для всех запросов к банкам
   - Поддержка Basic Auth и передачи credentials в теле
   - Автоматический fallback при ошибках аутентификации

2. **Обновлен OAuth Token Exchange** (`server/routes/banks.js`)
   - Использует `exchangeCodeForTokens()` из helper
   - Поддержка Basic Auth
   - Правильная обработка ошибок

3. **Обновлен Token Refresh** (`server/services/bankService.js`)
   - Использует `refreshToken()` из helper
   - Автоматическое обновление за 1 час до истечения
   - Правильная обработка ошибок

4. **Улучшены запросы к ресурсам** (`server/services/bankService.js`)
   - Использует `makeApiRequest()` из helper
   - Правильные заголовки для всех запросов
   - Детальное логирование ошибок

5. **Проверены все endpoints**
   - `/api/v1/accounts` - счеты
   - `/api/v1/cards` - карты
   - `/api/v1/transactions` - транзакции
   - `/api/v1/offers` - предложения

### 🔑 Credentials

Используются по умолчанию:
- **client_id**: `team264`
- **client_secret**: `gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx`

Могут быть переопределены через `.env`:
```env
BANK_CLIENT_ID=team264
BANK_CLIENT_SECRET=gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx
```

### 📋 POST Запросы

#### 1. Получение токена (Authorization Code)
- **Endpoint**: `POST /oauth/token`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Authorization**: `Basic <base64(client_id:client_secret)>` (опционально)
- **Параметры**: `grant_type`, `code`, `redirect_uri`, `client_id`, `client_secret`

#### 2. Обновление токена (Refresh Token)
- **Endpoint**: `POST /oauth/token`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Authorization**: `Basic <base64(client_id:client_secret)>` (опционально)
- **Параметры**: `grant_type`, `refresh_token`, `client_id`, `client_secret`

#### 3. Запросы к ресурсам
- **Authorization**: `Bearer <access_token>`
- **Content-Type**: `application/json`
- **Accept**: `application/json`

### 🔄 Автоматическое обновление токенов

- Токены обновляются за **1 час до истечения**
- Срок действия токена: **24 часа** (86400 секунд)
- Если обновление не удалось, используется старый токен (если еще валиден)

### 🛡️ Обработка ошибок

- Детальное логирование всех ошибок
- Автоматический fallback при ошибках аутентификации
- Таймаут 30 секунд для всех запросов
- Информативные сообщения об ошибках

### 📝 Новые файлы

1. `server/utils/bankApiHelper.js` - вспомогательные функции
2. `docs/BANK_API_INTEGRATION.md` - документация по интеграции

### 🔧 Обновленные файлы

1. `server/routes/banks.js` - использует helper для получения токенов
2. `server/services/bankService.js` - использует helper для всех запросов
3. `server/routes/offers.js` - правильный метод для запросов

### ✅ Проверено

- ✅ Все POST запросы используют правильный формат
- ✅ Credentials используются корректно
- ✅ Поддержка Basic Auth и передачи в теле
- ✅ Автоматическое обновление токенов
- ✅ Правильная обработка ошибок
- ✅ Детальное логирование

