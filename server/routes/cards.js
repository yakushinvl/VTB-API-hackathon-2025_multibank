const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { syncCards, syncTransactions } = require('../services/bankService');

const router = express.Router();

// Получить все карты пользователя
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const { type } = req.query;

  let query = 'SELECT * FROM cards WHERE user_id = ?';
  const params = [userId];

  if (type) {
    query += ' AND card_type = ?';
    params.push(type);
  }

  query += ' ORDER BY bank_name, card_number';

  db.all(query, params, (err, cards) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка получения карт' });
    }
    // Скрываем CVV для безопасности
    const safeCards = cards.map(card => ({
      ...card,
      cvv: card.cvv ? '***' : null
    }));
    res.json({ cards: safeCards });
  });
});

// Получить карту по ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const cardId = req.params.id;
  const { showCvv } = req.query;

  db.get(
    'SELECT * FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    (err, card) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения карты' });
      }
      if (!card) {
        return res.status(404).json({ message: 'Карта не найдена' });
      }
      
      // Показываем CVV только если явно запрошено
      if (showCvv !== 'true') {
        card.cvv = card.cvv ? '***' : null;
      }
      
      res.json({ card });
    }
  );
});

// Получить транзакции по карте
router.get('/:id/transactions', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const cardId = req.params.id;
  const { limit = 5, expand = false } = req.query;

  // Проверка прав доступа
  db.get(
    'SELECT id FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    (err, card) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка проверки доступа' });
      }
      if (!card) {
        return res.status(404).json({ message: 'Карта не найдена' });
      }

      let query = 'SELECT * FROM transactions WHERE card_id = ? AND user_id = ? ORDER BY transaction_date DESC';
      const params = [cardId, userId];

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

// Синхронизация карт
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
          console.log(`[cards/sync] Начинаем синхронизацию карт для userId=${userId}, bankConnectionId=${bankConnectionId}`);
          const result = await syncCards(userId, bankConnectionId);
          console.log(`[cards/sync] Синхронизация завершена:`, result);
          res.json({ 
            message: 'Карты успешно синхронизированы',
            synced: result.synced || 0,
            errors: result.errors || []
          });
        } catch (error) {
          console.error('[cards/sync] Ошибка синхронизации:', error);
          console.error('[cards/sync] Stack trace:', error.stack);
          res.status(500).json({ 
            message: 'Ошибка синхронизации карт',
            error: error.message || 'Неизвестная ошибка',
            details: error.response?.data || null,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Синхронизация транзакций по карте
router.post('/:id/transactions/sync', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const cardId = req.params.id;

    // Получить информацию о карте
    db.get(
      'SELECT * FROM cards WHERE id = ? AND user_id = ?',
      [cardId, userId],
      async (err, card) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения карты' });
        }
        if (!card) {
          return res.status(404).json({ message: 'Карта не найдена' });
        }

        try {
          const result = await syncTransactions(userId, card.bank_connection_id, null, card.card_id);
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

