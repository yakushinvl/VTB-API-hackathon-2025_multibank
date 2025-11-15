const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../multibank.db');

let db = null;

// Инициализация базы данных
function init() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Ошибка подключения к БД:', err);
        reject(err);
        return;
      }
      console.log('✅ Подключено к SQLite базе данных');
      createTables().then(resolve).catch(reject);
    });
  });
}

// Создание таблиц
function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Таблица пользователей
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          avatar TEXT,
          subscription_active INTEGER DEFAULT 0,
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'ru',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы users:', err);
          reject(err);
          return;
        }
      });

      // Таблица подключенных банков
      db.run(`
        CREATE TABLE IF NOT EXISTS bank_connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          bank_name TEXT NOT NULL,
          bank_domain TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at DATETIME,
          connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы bank_connections:', err);
          reject(err);
          return;
        }
      });

      // Таблица счетов
      db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          bank_connection_id INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          account_number TEXT NOT NULL,
          account_type TEXT NOT NULL,
          balance REAL DEFAULT 0,
          currency TEXT DEFAULT 'RUB',
          bank_name TEXT,
          bank_domain TEXT,
          last_sync DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (bank_connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
          UNIQUE(user_id, bank_connection_id, account_id)
        )
      `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы accounts:', err);
          reject(err);
          return;
        }
      });

      // Таблица карт
      db.run(`
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          bank_connection_id INTEGER NOT NULL,
          card_id TEXT NOT NULL,
          card_number TEXT NOT NULL,
          card_type TEXT NOT NULL,
          expiry_date TEXT,
          cvv TEXT,
          bank_name TEXT,
          bank_domain TEXT,
          last_sync DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (bank_connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
          UNIQUE(user_id, bank_connection_id, card_id)
        )
      `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы cards:', err);
          reject(err);
          return;
        }
      });

      // Таблица транзакций
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id INTEGER,
          card_id INTEGER,
          transaction_id TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'RUB',
          description TEXT,
          category TEXT,
          transaction_date DATETIME NOT NULL,
          bank_name TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
          UNIQUE(user_id, transaction_id)
        )
      `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы transactions:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

// Получить экземпляр БД
function getDB() {
  if (!db) {
    throw new Error('База данных не инициализирована. Вызовите init() сначала.');
  }
  return db;
}

// Закрыть соединение
function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Соединение с БД закрыто');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  init,
  getDB,
  close
};

