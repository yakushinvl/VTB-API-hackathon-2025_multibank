const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { syncAccounts, syncTransactions } = require('../services/bankService');

const router = express.Router();

// Получить все счета пользователя
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const { type } = req.query;

  let query = 'SELECT * FROM accounts WHERE user_id = ?';
  const params = [userId];

  if (type) {
    query += ' AND account_type = ?';
    params.push(type);
  }

  query += ' ORDER BY bank_name, account_number';

  db.all(query, params, (err, accounts) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка получения счетов' });
    }
    res.json({ accounts });
  });
});

// Получить счет по ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const accountId = req.params.id;

  db.get(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
    [accountId, userId],
    (err, account) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения счета' });
      }
      if (!account) {
        return res.status(404).json({ message: 'Счет не найден' });
      }
      res.json({ account });
    }
  );
});

// Получить транзакции по счету
router.get('/:id/transactions', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const accountId = req.params.id;
  const { limit = 5, expand = false } = req.query;

  // Проверка прав доступа
  db.get(
    'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
    [accountId, userId],
    (err, account) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка проверки доступа' });
      }
      if (!account) {
        return res.status(404).json({ message: 'Счет не найден' });
      }

      let query = 'SELECT * FROM transactions WHERE account_id = ? AND user_id = ? ORDER BY transaction_date DESC';
      const params = [accountId, userId];

      if (expand === 'false' || expand === false) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      db.all(query, params, (err, transactions) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения транзакций' });
        }
        res.json({ transactions });
      });
    }
  );
});

// Синхронизация счетов
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { bankConnectionId } = req.body;

    if (!bankConnectionId) {
      return res.status(400).json({ message: 'bankConnectionId обязателен' });
    }

    // Проверка прав доступа
    db.get(
      'SELECT id FROM bank_connections WHERE id = ? AND user_id = ?',
      [bankConnectionId, userId],
      async (err, connection) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка проверки доступа' });
        }
        if (!connection) {
          return res.status(404).json({ message: 'Подключение не найдено' });
        }

        try {
          const result = await syncAccounts(userId, bankConnectionId);
          res.json({ 
            message: 'Счета успешно синхронизированы',
            ...result
          });
        } catch (error) {
          res.status(500).json({ 
            message: 'Ошибка синхронизации счетов',
            error: error.message 
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Синхронизация транзакций по счету
router.post('/:id/transactions/sync', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const accountId = req.params.id;

    // Получить информацию о счете
    db.get(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId],
      async (err, account) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения счета' });
        }
        if (!account) {
          return res.status(404).json({ message: 'Счет не найден' });
        }

        try {
          const result = await syncTransactions(userId, account.bank_connection_id, account.account_id);
          res.json({ 
            message: 'Транзакции успешно синхронизированы',
            ...result
          });
        } catch (error) {
          res.status(500).json({ 
            message: 'Ошибка синхронизации транзакций',
            error: error.message 
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;

