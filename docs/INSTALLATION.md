# Инструкция по установке и запуску

## Требования

- **Node.js** версии 18 или выше
- **npm** или **yarn**
- **Git** (для клонирования репозитория)

## Установка

### Шаг 1: Клонирование репозитория

```bash
git clone <repository-url>
cd VTB-API-hackathon-2025_multibank
```

### Шаг 2: Установка зависимостей

Установите зависимости для backend и frontend:

```bash
# Установка всех зависимостей (backend и frontend)
npm run install-all
```

Или по отдельности:

```bash
# Backend зависимости
npm install

# Frontend зависимости
cd client
npm install
cd ..
```

### Шаг 3: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Порт сервера
PORT=5000

# Секретный ключ для JWT (измените на свой!)
JWT_SECRET=your-super-secret-key-change-in-production

# Режим работы
NODE_ENV=development

# URL клиента (для CORS и OAuth redirects)
CLIENT_URL=http://localhost:3000

# OAuth клиенты банков (получите в документации банков)
VBANK_CLIENT_ID=your-vbank-client-id
VBANK_CLIENT_SECRET=your-vbank-client-secret
ABANK_CLIENT_ID=your-abank-client-id
ABANK_CLIENT_SECRET=your-abank-client-secret
SBANK_CLIENT_ID=your-sbank-client-id
SBANK_CLIENT_SECRET=your-sbank-client-secret
```

**Важно:** 
- Измените `JWT_SECRET` на случайную строку для production
- Получите реальные OAuth credentials от банков для работы с их API

### Шаг 4: Инициализация базы данных

База данных SQLite создастся автоматически при первом запуске сервера. Файл базы данных `multibank.db` будет создан в корне проекта.

## Запуск

### Режим разработки

Запустите backend и frontend одновременно:

```bash
npm run dev
```

Это запустит:
- Backend сервер на `http://localhost:5000`
- Frontend приложение на `http://localhost:3000`

Или запустите по отдельности:

```bash
# Терминал 1: Backend
npm run server

# Терминал 2: Frontend
npm run client
```

### Production режим

1. Соберите frontend:

```bash
npm run build
```

2. Запустите сервер:

```bash
npm start
```

Приложение будет доступно на `http://localhost:5000`

## Использование

### Первый запуск

1. Откройте браузер и перейдите на `http://localhost:3000`
2. Зарегистрируйте новый аккаунт
3. Войдите в систему
4. Перейдите в профиль и подключите банки
5. Синхронизируйте счета и карты

### Подключение банков

1. Перейдите в раздел "Профиль"
2. В разделе "Доступные банки" нажмите "Подключить"
3. Вы будете перенаправлены на страницу авторизации банка
4. После авторизации банк вернет вас в приложение
5. Данные банка будут автоматически синхронизированы

### Синхронизация данных

- Счета и карты синхронизируются автоматически при подключении банка
- Для обновления данных используйте кнопку "Синхронизировать" в профиле
- Транзакции можно синхронизировать отдельно для каждого счета/карты

## Развертывание на GitHub Pages

### Подготовка

1. Соберите frontend:

```bash
cd client
npm run build
cd ..
```

2. Настройте API URL в `client/src/services/api.js`:

```javascript
const api = axios.create({
  baseURL: 'https://your-production-api-url.com/api',
  // ...
});
```

3. Создайте файл `.nojekyll` в папке `client/build` (если используете Jekyll)

### Деплой

1. Перейдите в настройки репозитория GitHub
2. В разделе "Pages" выберите источник: "GitHub Actions" или "Deploy from a branch"
3. Если используете branch, выберите папку `client/build`

Или используйте GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: cd client && npm install && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./client/build
```

## Развертывание на собственном сервере

### Использование PM2

1. Установите PM2:

```bash
npm install -g pm2
```

2. Создайте файл `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'multibank',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

3. Запустите:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Использование Docker

1. Создайте `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN cd client && npm install && npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

2. Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./multibank.db:/app/multibank.db
```

3. Запустите:

```bash
docker-compose up -d
```

## Устранение неполадок

### Проблема: База данных не создается

**Решение:** Убедитесь, что у приложения есть права на запись в директорию проекта.

### Проблема: CORS ошибки

**Решение:** Проверьте настройки `CLIENT_URL` в `.env` файле и убедитесь, что frontend запущен на правильном порту.

### Проблема: Ошибки подключения к банковским API

**Решение:** 
- Проверьте правильность OAuth credentials
- Убедитесь, что используете sandbox окружение для тестирования
- Проверьте документацию конкретного банка

### Проблема: Токены истекают слишком быстро

**Решение:** Настройте автоматическое обновление токенов. Проверьте логику в `bankService.js`.

### Проблема: Frontend не подключается к backend

**Решение:**
- Проверьте, что backend запущен на порту 5000
- Проверьте настройки proxy в `client/package.json`
- Проверьте переменную `REACT_APP_API_URL` в frontend

## Дополнительные настройки

### Настройка базы данных

По умолчанию используется SQLite. Для production рекомендуется использовать PostgreSQL или MySQL:

1. Установите соответствующий драйвер:

```bash
npm install pg  # для PostgreSQL
# или
npm install mysql2  # для MySQL
```

2. Обновите `server/models/database.js` для использования новой БД

### Настройка логирования

Добавьте библиотеку логирования (например, `winston`):

```bash
npm install winston
```

### Настройка rate limiting

Добавьте защиту от DDoS:

```bash
npm install express-rate-limit
```

## Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все зависимости установлены
4. Проверьте версию Node.js: `node --version` (должна быть 18+)

## Лицензия

MIT

