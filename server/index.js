const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Инициализация базы данных
const db = require('./models/database');
db.init();

// Роуты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/user', require('./routes/user'));
app.use('/api/banks', require('./routes/banks'));

// Статические файлы для production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Режим: ${process.env.NODE_ENV || 'development'}`);
});

