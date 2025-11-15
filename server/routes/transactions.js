const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');

const router = express.Router();

// Получить все транзакции пользователя
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const { 
    accountId, 
    cardId, 
    startDate, 
    endDate,
    limit,
    offset = 0
  } = req.query;

  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [userId];

  if (accountId) {
    query += ' AND account_id = ?';
    params.push(accountId);
  }

  if (cardId) {
    query += ' AND card_id = ?';
    params.push(cardId);
  }

  if (startDate) {
    query += ' AND transaction_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND transaction_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY transaction_date DESC';

  if (limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
  }

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка получения транзакций' });
    }

    // Получить статистику за текущий месяц
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    db.get(
      `SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income
       FROM transactions 
       WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?`,
      [userId, startOfMonth, endOfMonth],
      (err, stats) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения статистики' });
        }

        res.json({
          transactions,
          stats: {
            count: stats.count || 0,
            expenses: stats.expenses || 0,
            income: stats.income || 0
          }
        });
      }
    );
  });
});

// Получить транзакцию по ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const transactionId = req.params.id;

  db.get(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    [transactionId, userId],
    (err, transaction) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения транзакции' });
      }
      if (!transaction) {
        return res.status(404).json({ message: 'Транзакция не найдена' });
      }
      res.json({ transaction });
    }
  );
});

module.exports = router;

