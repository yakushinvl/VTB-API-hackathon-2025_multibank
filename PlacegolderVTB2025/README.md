# FinAggregator - Единая платформа управления финансами

## Описание

FinAggregator - это единое приложение для управления всеми банковскими счетами, агрегирующее данные из различных банков через Open Banking API. Платформа предоставляет:

- **Агрегация счетов**: дебетовые, накопительные, вклады, кредитные карты
- **Единая история трат** со всех карт
- **Управление финансами** между счетами
- **Рекомендации продуктов** других банков
- **ИИ ассистент** для анализа трат и оптимизации платежей (подписка)
- **Помощник по выбору кэшбэка** между банками

## Технологический стек

### Backend
- **FastAPI** - современный веб-фреймворк для Python
- **PostgreSQL** - основная база данных
- **Redis** - кэширование и очереди
- **SQLAlchemy** - ORM
- **Pydantic** - валидация данных
- **OpenAI API** - ИИ ассистент для анализа трат

### Frontend
- **React** + **TypeScript** - пользовательский интерфейс
- **Tailwind CSS** - стилизация
- **React Query** - управление состоянием и кэширование
- **Recharts** - визуализация данных
- **Axios** - HTTP клиент

### Инфраструктура
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация сервисов

## Архитектура

```
┌─────────────┐
│   Frontend  │ (React + TypeScript)
└──────┬──────┘
       │
┌──────▼──────┐
│  Backend API│ (FastAPI)
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼───┐ ┌─▼────┐
│PostgreSQL│ │ Redis  │
└─────────┘ └────────┘
       │
┌──────▼──────────────────┐
│  Bank API Adapters      │
│  (Awesome, Smart, VBank)│
└─────────────────────────┘
```

## Монетизация

1. **Бесплатный план**: базовая агрегация счетов, история трат
2. **Премиум подписка** (999₽/мес): 
   - ИИ ассистент с анализом трат
   - Персонализированные рекомендации
   - Помощник по выбору кэшбэка
   - Продвинутая аналитика
   - Экспорт данных

## Установка и запуск

### Требования
- Docker и Docker Compose
- Python 3.11+ (для локальной разработки)
- Node.js 18+ (для локальной разработки)

### Запуск через Docker

```bash
docker-compose up -d
```

### Локальная разработка

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Конфигурация

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finaggregator

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI API (для ИИ ассистента)
OPENAI_API_KEY=your_openai_api_key

# Банковские API
VBANK_API_URL=https://api.vbank.example.com
VBANK_CLIENT_ID=team200
VBANK_CLIENT_SECRET=your_secret

ABANK_API_URL=https://api.abank.example.com
ABANK_CLIENT_ID=team200
ABANK_CLIENT_SECRET=your_secret

SBANK_API_URL=https://api.sbank.example.com
SBANK_CLIENT_ID=team200
SBANK_CLIENT_SECRET=your_secret

# JWT
JWT_SECRET_KEY=your_jwt_secret
JWT_ALGORITHM=HS256

# Frontend
FRONTEND_URL=http://localhost:3000
```

## API Документация

После запуска backend, документация доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Основные функции

### 1. Агрегация счетов
- Подключение счетов из разных банков
- Автоматическая синхронизация данных
- Категоризация счетов (дебетовые, накопительные, вклады, кредитные)

### 2. Единая история трат
- Объединение транзакций со всех счетов
- Фильтрация и поиск
- Категоризация трат
- Визуализация расходов

### 3. Управление финансами
- Переводы между счетами
- Планирование бюджета
- Цели накопления

### 4. Рекомендации продуктов
- Анализ текущих продуктов
- Подбор лучших предложений от других банков
- Сравнение условий

### 5. ИИ ассистент (Премиум)
- Анализ трат и паттернов
- Рекомендации по оптимизации расходов
- Советы по выбору банковских продуктов
- Помощник по выбору кэшбэка

## Масштабируемость

- Модульная архитектура для добавления новых банков
- Микросервисная готовность
- Кэширование для производительности
- Асинхронная обработка данных
- Поддержка локализации (готово к расширению)

## Структура проекта

```
.
├── backend/                 # Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Конфигурация и безопасность
│   │   ├── db/             # Модели БД и инициализация
│   │   ├── services/       # Бизнес-логика
│   │   └── main.py         # Точка входа
│   ├── requirements.txt    # Зависимости Python
│   └── Dockerfile          # Docker образ
├── frontend/               # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── contexts/       # React контексты
│   │   ├── pages/          # Страницы приложения
│   │   ├── services/       # API сервисы
│   │   └── App.tsx         # Главный компонент
│   ├── package.json        # Зависимости Node.js
│   └── Dockerfile          # Docker образ
├── docker-compose.yml      # Docker Compose конфигурация
├── README.md               # Основная документация
├── ARCHITECTURE.md         # Архитектура решения
├── DEPLOYMENT.md           # Инструкции по развертыванию
└── SOLUTION.md             # Описание решения
```

## Дополнительная документация

- [ARCHITECTURE.md](ARCHITECTURE.md) - Детальное описание архитектуры
- [DEPLOYMENT.md](DEPLOYMENT.md) - Инструкции по развертыванию
- [SOLUTION.md](SOLUTION.md) - Описание решения для хакатона

## Лицензия

MIT

## Команда

Разработано для хакатона ВТБ HackAPI 2025

