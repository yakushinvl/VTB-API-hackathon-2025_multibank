const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { BANKS } = require('../services/bankService');

const router = express.Router();

// Получить список доступных банков
router.get('/available', (req, res) => {
  const banksList = Object.values(BANKS).map(bank => ({
    id: bank.name.toLowerCase(),
    name: bank.name,
    domain: bank.domain
  }));

  res.json({ banks: banksList });
});

// Получить подключенные банки пользователя
router.get('/connected', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  db.all(
    'SELECT id, bank_name, bank_domain, connected_at FROM bank_connections WHERE user_id = ?',
    [userId],
    (err, connections) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения подключений' });
      }
      res.json({ connections });
    }
  );
});

// Инициировать OAuth подключение банка
router.post('/connect/:bankName', authenticateToken, (req, res) => {
  const { bankName } = req.params;
  const bankConfig = BANKS[bankName.toLowerCase()];

  if (!bankConfig) {
    return res.status(400).json({ message: 'Банк не найден' });
  }

  // OAuth flow с реальными credentials
  const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth/callback`;
  const clientId = process.env.BANK_CLIENT_ID || 'team264';
  const clientSecret = process.env.BANK_CLIENT_SECRET || 'gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx';
  
  const authUrl = `${bankConfig.authUrl}?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=accounts cards transactions&` +
    `state=${req.user.id}_${bankName}`;

  res.json({
    authUrl,
    message: 'Перейдите по ссылке для авторизации',
    clientId,
    redirectUri
  });
});

// Обработка OAuth callback (сохранение токенов)
router.post('/callback', authenticateToken, async (req, res) => {
  try {
    const { code, state, bankName } = req.body;
    const userId = req.user.id;

    if (!code || !bankName) {
      return res.status(400).json({ message: 'Отсутствуют необходимые параметры' });
    }

    const bankConfig = BANKS[bankName.toLowerCase()];
    if (!bankConfig) {
      return res.status(400).json({ message: 'Банк не найден' });
    }

    const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth/callback`;
    const { exchangeCodeForTokens } = require('../utils/bankApiHelper');

    // Обмен code на токены
    try {
      const tokenResponse = await exchangeCodeForTokens(bankConfig.tokenUrl, code, redirectUri);

      const { access_token, refresh_token, expires_in } = tokenResponse;
      // Токен работает 24 часа
      const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000);

      const db = getDB();
      db.run(
        `INSERT INTO bank_connections 
         (user_id, bank_name, bank_domain, access_token, refresh_token, token_expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, bankConfig.name, bankConfig.domain, access_token, refresh_token, expiresAt],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Ошибка сохранения подключения' });
          }

          res.json({
            message: 'Банк успешно подключен',
            connectionId: this.lastID
          });
        }
      );
    } catch (tokenError) {
      console.error('Ошибка получения токена:', tokenError.response?.data || tokenError.message);
      return res.status(500).json({ 
        message: 'Ошибка получения токена от банка',
        error: tokenError.response?.data || tokenError.message
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обработки callback', error: error.message });
  }
});

// Отключить банк
router.delete('/:connectionId', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const connectionId = req.params.connectionId;

  db.run(
    'DELETE FROM bank_connections WHERE id = ? AND user_id = ?',
    [connectionId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Ошибка отключения банка' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Подключение не найдено' });
      }
      res.json({ message: 'Банк успешно отключен' });
    }
  );
});

module.exports = router;

