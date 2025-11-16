const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { BANKS, syncAccounts, syncCards } = require('../services/bankService');
const { getBankToken } = require('../utils/bankApiHelper');

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

// Подключить банк (без OAuth, просто сохраняем подключение)
router.post('/connect/:bankName', authenticateToken, async (req, res) => {
  try {
    const { bankName } = req.params;
    const bankConfig = BANKS[bankName.toLowerCase()];

    if (!bankConfig) {
      return res.status(400).json({ message: 'Банк не найден' });
    }

    const db = getDB();
    const userId = req.user.id;

    // Проверяем, не подключен ли уже этот банк
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM bank_connections WHERE user_id = ? AND bank_name = ?',
        [userId, bankConfig.name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing) {
      return res.status(400).json({ message: 'Банк уже подключен' });
    }

    // Функция для обработки синхронизации после подключения
    const handleSyncAfterConnect = async (connectionId) => {
      try {
        console.log(`Начинаем синхронизацию данных для банка ${bankConfig.name} (connectionId: ${connectionId})`);
        
        // Синхронизируем счета и карты параллельно
        const [accountsResult, cardsResult] = await Promise.allSettled([
          syncAccounts(userId, connectionId),
          syncCards(userId, connectionId)
        ]);

        const syncResults = {
          accounts: accountsResult.status === 'fulfilled' ? accountsResult.value : { synced: 0, error: accountsResult.reason?.message || 'Ошибка синхронизации счетов' },
          cards: cardsResult.status === 'fulfilled' ? cardsResult.value : { synced: 0, error: cardsResult.reason?.message || 'Ошибка синхронизации карт' }
        };

        console.log('Результаты синхронизации:', syncResults);

        // Если есть ошибки, логируем их
        if (accountsResult.status === 'rejected') {
          console.error('Ошибка синхронизации счетов:', accountsResult.reason);
          if (accountsResult.reason?.stack) {
            console.error('Stack trace счетов:', accountsResult.reason.stack);
          }
        }
        if (cardsResult.status === 'rejected') {
          console.error('Ошибка синхронизации карт:', cardsResult.reason);
          if (cardsResult.reason?.stack) {
            console.error('Stack trace карт:', cardsResult.reason.stack);
          }
        }

        res.json({
          message: 'Банк успешно подключен',
          connectionId: connectionId,
          syncResults: {
            accounts: syncResults.accounts.synced || 0,
            cards: syncResults.cards.synced || 0,
            errors: {
              accounts: syncResults.accounts.error,
              cards: syncResults.cards.error
            }
          }
        });
      } catch (syncError) {
        console.error('Критическая ошибка синхронизации данных:', syncError);
        console.error('Stack trace:', syncError.stack);
        // Все равно возвращаем успех, но с предупреждением
        res.json({
          message: 'Банк успешно подключен, но произошла ошибка при синхронизации данных',
          connectionId: connectionId,
          warning: syncError.message || 'Неизвестная ошибка синхронизации'
        });
      }
    };

    // Получаем токен перед созданием подключения
    console.log(`[connect] Получение токена для банка ${bankConfig.name}`);
    const tokenResponse = await getBankToken(bankConfig.baseUrl);
    const token = tokenResponse.access_token; // API возвращает access_token
    
    console.log(`[connect] ==========================================`);
    console.log(`[connect] ПОЛУЧЕННЫЙ ТОКЕН ПРИ ПОДКЛЮЧЕНИИ БАНКА:`);
    console.log(`[connect] ${token}`);
    console.log(`[connect] Полный ответ от API:`, JSON.stringify(tokenResponse));
    console.log(`[connect] ==========================================`);
    
    if (!token) {
      console.error('[connect] Токен не найден в ответе:', tokenResponse);
      return res.status(500).json({ message: 'Не удалось получить токен от банка' });
    }

    const expiresAt = tokenResponse.expires_in 
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // По умолчанию 24 часа

    // Создаем подключение с токеном
    const connectionId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bank_connections 
         (user_id, bank_name, bank_domain, access_token, refresh_token, token_expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, bankConfig.name, bankConfig.domain, token, '', expiresAt],
        function(err) {
          if (err) {
            console.error('[connect] Ошибка сохранения подключения:', err);
            console.error('[connect] Детали ошибки:', {
              message: err.message,
              code: err.code,
              errno: err.errno
            });
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });

    await handleSyncAfterConnect(connectionId);
  } catch (error) {
    console.error('[connect] Ошибка подключения к банку:', error);
    return res.status(500).json({ 
      message: 'Ошибка подключения к банку',
      error: error.response?.data || error.message
    });
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
