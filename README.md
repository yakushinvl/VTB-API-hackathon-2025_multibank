# Мультибанк - Единый интерфейс финансового сервиса

Веб-приложение для агрегации счетов и карт из разных банков через открытые банковские API.

## Возможности

- 🔐 Регистрация и авторизация пользователей
- 🏦 Подключение счетов и карт из разных банков (vbank, abank, sbank)
- 💳 Просмотр всех счетов и карт в едином интерфейсе
- 📊 Анализ транзакций и расходов
- 💡 Персонализированные предложения от банков
- 🤖 ИИ-помощник для финансового планирования (премиум)
- 🌓 Темная/светлая тема
- 🌍 Поддержка русского и английского языков

## Технологии

- **Backend**: Node.js, Express
- **Frontend**: React
- **База данных**: SQLite
- **Аутентификация**: JWT, OAuth 2.0
- **API**: Open Banking API (vbank, abank, sbank)

## Установка и запуск

### Требования

- Node.js 18+ 
- npm или yarn

### Шаг 1: Установка зависимостей

```bash
npm run install-all
```

### Шаг 2: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### Шаг 3: Запуск приложения

**Режим разработки** (с hot-reload):
```bash
npm run dev
```

**Production режим**:
```bash
npm start
```

Приложение будет доступно:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Структура проекта

```
├── server/              # Backend приложение
│   ├── index.js        # Точка входа сервера
│   ├── routes/         # API маршруты
│   ├── models/         # Модели базы данных
│   ├── middleware/     # Middleware функции
│   ├── services/       # Бизнес-логика
│   └── utils/          # Утилиты
├── client/             # Frontend приложение (React)
│   ├── src/
│   │   ├── components/ # React компоненты
│   │   ├── pages/      # Страницы приложения
│   │   ├── services/   # API клиенты
│   │   └── utils/      # Утилиты
│   └── public/
└── docs/               # Документация
```

## API Банков

Приложение поддерживает работу с:
- vbank.open.bankingapi.ru
- abank.open.bankingapi.ru
- sbank.open.bankingapi.ru

## Документация

Подробная документация находится в файле `docs/ARCHITECTURE.md`

## Лицензия

MIT

