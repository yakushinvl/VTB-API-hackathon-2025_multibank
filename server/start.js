#!/usr/bin/env node

/**
 * Файл для запуска сервера через node start.js
 * Использование: node server/start.js
 */

const path = require('path');

// Загрузка переменных окружения
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Запуск сервера
require('./index');

