# Интеграция с банковскими API

## Обзор

Приложение интегрировано с тремя тестовыми банками через Open Banking API:
- **VBank**: https://vbank.open.bankingapi.ru
- **ABank**: https://abank.open.bankingapi.ru  
- **SBank**: https://sbank.open.bankingapi.ru

## Аутентификация

### Credentials

- **client_id**: `team264`
- **client_secret**: `gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx`

Эти значения используются по умолчанию, но могут быть переопределены через переменные окружения:
```env
BANK_CLIENT_ID=team264
BANK_CLIENT_SECRET=gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx
```

### OAuth 2.0 Flow

1. **Authorization Request** (`GET /oauth/authorize`)
   - Параметры: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`
   - Пользователь перенаправляется на страницу авторизации банка

2. **Token Exchange** (`POST /oauth/token`)
   - Параметры: `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`
   - Формат: `application/x-www-form-urlencoded`
   - Поддержка Basic Auth и передачи в теле запроса

3. **Token Refresh** (`POST /oauth/token`)
   - Параметры: `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret`
   - Токены обновляются автоматически за 1 час до истечения
   - Срок действия токена: 24 часа (86400 секунд)

## POST Запросы к API

### 1. Получение токена (Authorization Code Flow)

**Endpoint**: `POST /oauth/token`

**Заголовки**:
```
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>
Accept: application/json
```

**Тело запроса** (form-urlencoded):
```
grant_type=authorization_code
code=<authorization_code>
redirect_uri=<redirect_uri>
client_id=team264
client_secret=gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx
```

**Ответ**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

### 2. Обновление токена (Refresh Token Flow)

**Endpoint**: `POST /oauth/token`

**Заголовки**:
```
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>
Accept: application/json
```

**Тело запроса** (form-urlencoded):
```
grant_type=refresh_token
refresh_token=<refresh_token>
client_id=team264
client_secret=gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx
```

**Ответ**: Аналогичен ответу получения токена

### 3. Запросы к ресурсам банка

Все запросы к ресурсам банка используют Bearer токен:

**Заголовки**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

**Endpoints**:
- `GET /api/v1/accounts` - список счетов
- `GET /api/v1/cards` - список карт
- `GET /api/v1/transactions` - список транзакций
- `GET /api/v1/accounts/:id/transactions` - транзакции по счету
- `GET /api/v1/cards/:id/transactions` - транзакции по карте
- `GET /api/v1/offers` - предложения банка

## Реализация

### Файлы

1. **`server/utils/bankApiHelper.js`** - вспомогательные функции для работы с API
   - `exchangeCodeForTokens()` - обмен code на токены
   - `refreshToken()` - обновление токена
   - `makeApiRequest()` - выполнение запросов к API
   - `getBankCredentials()` - получение credentials

2. **`server/services/bankService.js`** - сервис для работы с банками
   - `makeBankRequest()` - выполнение запросов
   - `syncAccounts()` - синхронизация счетов
   - `syncCards()` - синхронизация карт
   - `syncTransactions()` - синхронизация транзакций
   - `refreshAccessToken()` - обновление токена
   - `getValidAccessToken()` - получение валидного токена

3. **`server/routes/banks.js`** - роуты для работы с банками
   - `POST /connect/:bankName` - инициация подключения
   - `POST /callback` - обработка OAuth callback

### Особенности реализации

1. **Поддержка Basic Auth и передачи в теле**
   - Сначала пробуем с Basic Auth
   - Если получаем 401, пробуем без Basic Auth (передача в теле)

2. **Автоматическое обновление токенов**
   - Токены обновляются за 1 час до истечения
   - Если обновление не удалось, используется старый токен (если еще валиден)

3. **Обработка ошибок**
   - Детальное логирование ошибок
   - Информативные сообщения об ошибках
   - Таймаут 30 секунд для всех запросов

4. **Валидация данных**
   - Проверка наличия токенов
   - Проверка срока действия
   - Валидация ответов API

## Примеры использования

### Подключение банка

```javascript
// 1. Инициация подключения
POST /api/banks/connect/vbank
// Возвращает authUrl для редиректа

// 2. Пользователь авторизуется в банке
// Банк перенаправляет на /oauth/callback?code=...&state=...

// 3. Обработка callback
POST /api/banks/callback
Body: { code, state, bankName }
// Сохраняет токены в БД
```

### Синхронизация данных

```javascript
// Синхронизация счетов
POST /api/accounts/sync
Body: { bankConnectionId }

// Синхронизация карт
POST /api/cards/sync
Body: { bankConnectionId }

// Синхронизация транзакций
POST /api/accounts/:id/transactions/sync
```

## Обработка ошибок

### Типичные ошибки

1. **401 Unauthorized**
   - Токен истек или невалиден
   - Автоматическое обновление токена

2. **404 Not Found**
   - Неправильный endpoint
   - Ресурс не найден

3. **429 Too Many Requests**
   - Превышен лимит запросов
   - Рекомендуется реализовать retry с exponential backoff

4. **500 Internal Server Error**
   - Ошибка на стороне банка
   - Логирование и уведомление пользователя

### Логирование

Все ошибки логируются с детальной информацией:
- URL запроса
- Метод запроса
- HTTP статус
- Тело ответа
- Сообщение об ошибке

## Безопасность

1. **Хранение токенов**
   - Токены хранятся в зашифрованном виде в БД
   - CVV карт скрыт по умолчанию

2. **Передача данных**
   - HTTPS для всех запросов
   - Bearer токены в заголовке Authorization
   - Basic Auth только для получения токенов

3. **Валидация**
   - Проверка прав доступа пользователя
   - Валидация входных данных
   - Проверка срока действия токенов

## Тестирование

Для тестирования используйте sandbox окружение банков:
- VBank: https://vbank.open.bankingapi.ru/docs
- ABank: https://abank.open.bankingapi.ru/docs
- SBank: https://sbank.open.bankingapi.ru/docs

## Дополнительные ресурсы

- [Open Banking Russia Standards](https://www.openbankingrussia.ru/open-api-standards/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [Open Banking API Documentation](https://cbr.ru/StaticHtml/File/59420/Standart_08072021.pdf)

