const axios = require('axios');
const { getDB } = require('../models/database');

// Конфигурация банков
const BANKS = {
  vbank: {
    name: 'VBank',
    domain: 'vbank.open.bankingapi.ru',
    baseUrl: 'https://vbank.open.bankingapi.ru',
    authUrl: 'https://vbank.open.bankingapi.ru/oauth/authorize',
    tokenUrl: 'https://vbank.open.bankingapi.ru/oauth/token'
  },
  abank: {
    name: 'ABank',
    domain: 'abank.open.bankingapi.ru',
    baseUrl: 'https://abank.open.bankingapi.ru',
    authUrl: 'https://abank.open.bankingapi.ru/oauth/authorize',
    tokenUrl: 'https://abank.open.bankingapi.ru/oauth/token'
  },
  sbank: {
    name: 'SBank',
    domain: 'sbank.open.bankingapi.ru',
    baseUrl: 'https://sbank.open.bankingapi.ru',
    authUrl: 'https://sbank.open.bankingapi.ru/oauth/authorize',
    tokenUrl: 'https://sbank.open.bankingapi.ru/oauth/token'
  }
};

// Получить конфигурацию банка
function getBankConfig(bankName) {
  return BANKS[bankName.toLowerCase()];
}

// Обновить токен доступа
async function refreshAccessToken(userId, bankConnectionId) {
  const db = getDB();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM bank_connections WHERE id = ? AND user_id = ?',
      [bankConnectionId, userId],
      async (err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        if (!connection) {
          reject(new Error('Подключение не найдено'));
          return;
        }

        const bankConfig = getBankConfig(connection.bank_name);
        if (!bankConfig) {
          reject(new Error('Банк не найден'));
          return;
        }

        try {
          // Запрос на обновление токена
          const response = await axios.post(bankConfig.tokenUrl, {
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: process.env[`${connection.bank_name.toUpperCase()}_CLIENT_ID`] || 'default',
            client_secret: process.env[`${connection.bank_name.toUpperCase()}_CLIENT_SECRET`] || 'default'
          });

          const { access_token, refresh_token, expires_in } = response.data;
          const expiresAt = new Date(Date.now() + expires_in * 1000);

          // Обновление токена в БД
          db.run(
            'UPDATE bank_connections SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?',
            [access_token, refresh_token || connection.refresh_token, expiresAt, bankConnectionId],
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(access_token);
            }
          );
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Получить валидный токен доступа
async function getValidAccessToken(userId, bankConnectionId) {
  const db = getDB();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM bank_connections WHERE id = ? AND user_id = ?',
      [bankConnectionId, userId],
      async (err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        if (!connection) {
          reject(new Error('Подключение не найдено'));
          return;
        }

        // Проверка срока действия токена
        const expiresAt = new Date(connection.token_expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          // Токен валиден
          resolve(connection.access_token);
        } else {
          // Токен истек, обновляем
          try {
            const newToken = await refreshAccessToken(userId, bankConnectionId);
            resolve(newToken);
          } catch (error) {
            reject(error);
          }
        }
      }
    );
  });
}

// API запрос к банку
async function makeBankRequest(userId, bankConnectionId, endpoint, method = 'GET', data = null) {
  try {
    const token = await getValidAccessToken(userId, bankConnectionId);
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        async (err, connection) => {
          if (err) {
            reject(err);
            return;
          }

          const bankConfig = getBankConfig(connection.bank_name);
          if (!bankConfig) {
            reject(new Error('Банк не найден'));
            return;
          }

          const url = `${bankConfig.baseUrl}${endpoint}`;
          const config = {
            method,
            url,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };

          if (data) {
            config.data = data;
          }

          try {
            const response = await axios(config);
            resolve(response.data);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
}

// Синхронизация счетов
async function syncAccounts(userId, bankConnectionId) {
  try {
    const accountsData = await makeBankRequest(userId, bankConnectionId, '/api/v1/accounts');
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name, bank_domain FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        (err, connection) => {
          if (err) {
            reject(err);
            return;
          }

          const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || []);
          let processed = 0;
          const errors = [];

          if (accounts.length === 0) {
            resolve({ synced: 0, errors: [] });
            return;
          }

          accounts.forEach((account) => {
            db.run(
              `INSERT OR REPLACE INTO accounts 
               (user_id, bank_connection_id, account_id, account_number, account_type, balance, currency, bank_name, bank_domain, last_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                bankConnectionId,
                account.id || account.account_id,
                account.number || account.account_number,
                account.type || account.account_type || 'debit',
                account.balance || 0,
                account.currency || 'RUB',
                connection.bank_name,
                connection.bank_domain
              ],
              (err) => {
                processed++;
                if (err) {
                  errors.push({ account: account.id, error: err.message });
                }
                if (processed === accounts.length) {
                  resolve({ synced: accounts.length - errors.length, errors });
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    throw error;
  }
}

// Синхронизация карт
async function syncCards(userId, bankConnectionId) {
  try {
    const cardsData = await makeBankRequest(userId, bankConnectionId, '/api/v1/cards');
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name, bank_domain FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        (err, connection) => {
          if (err) {
            reject(err);
            return;
          }

          const cards = Array.isArray(cardsData) ? cardsData : (cardsData.cards || []);
          let processed = 0;
          const errors = [];

          if (cards.length === 0) {
            resolve({ synced: 0, errors: [] });
            return;
          }

          cards.forEach((card) => {
            db.run(
              `INSERT OR REPLACE INTO cards 
               (user_id, bank_connection_id, card_id, card_number, card_type, expiry_date, cvv, bank_name, bank_domain, last_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                bankConnectionId,
                card.id || card.card_id,
                card.number || card.card_number,
                card.type || card.card_type || 'debit',
                card.expiry_date || card.expiryDate,
                card.cvv || card.cvv_code,
                connection.bank_name,
                connection.bank_domain
              ],
              (err) => {
                processed++;
                if (err) {
                  errors.push({ card: card.id, error: err.message });
                }
                if (processed === cards.length) {
                  resolve({ synced: cards.length - errors.length, errors });
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    throw error;
  }
}

// Синхронизация транзакций
async function syncTransactions(userId, bankConnectionId, accountId = null, cardId = null) {
  try {
    let endpoint = '/api/v1/transactions';
    if (accountId) {
      endpoint = `/api/v1/accounts/${accountId}/transactions`;
    } else if (cardId) {
      endpoint = `/api/v1/cards/${cardId}/transactions`;
    }

    const transactionsData = await makeBankRequest(userId, bankConnectionId, endpoint);
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        (err, connection) => {
          if (err) {
            reject(err);
            return;
          }

          const transactions = Array.isArray(transactionsData) 
            ? transactionsData 
            : (transactionsData.transactions || []);
          
          let processed = 0;
          const errors = [];

          if (transactions.length === 0) {
            resolve({ synced: 0, errors: [] });
            return;
          }

          transactions.forEach((transaction) => {
            // Найти account_id или card_id
            const accountNumber = transaction.account_number || transaction.accountNumber;
            const cardNumber = transaction.card_number || transaction.cardNumber;

            let localAccountId = null;
            let localCardId = null;

            if (accountNumber) {
              db.get(
                'SELECT id FROM accounts WHERE account_number = ? AND user_id = ?',
                [accountNumber, userId],
                (err, account) => {
                  if (!err && account) localAccountId = account.id;
                }
              );
            }

            if (cardNumber) {
              db.get(
                'SELECT id FROM cards WHERE card_number = ? AND user_id = ?',
                [cardNumber, userId],
                (err, card) => {
                  if (!err && card) localCardId = card.id;
                }
              );
            }

            db.run(
              `INSERT OR REPLACE INTO transactions 
               (user_id, account_id, card_id, transaction_id, amount, currency, description, category, transaction_date, bank_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                localAccountId,
                localCardId,
                transaction.id || transaction.transaction_id,
                transaction.amount || 0,
                transaction.currency || 'RUB',
                transaction.description || transaction.details,
                transaction.category,
                transaction.date || transaction.transaction_date || new Date().toISOString(),
                connection.bank_name
              ],
              (err) => {
                processed++;
                if (err) {
                  errors.push({ transaction: transaction.id, error: err.message });
                }
                if (processed === transactions.length) {
                  resolve({ synced: transactions.length - errors.length, errors });
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getBankConfig,
  refreshAccessToken,
  getValidAccessToken,
  makeBankRequest,
  syncAccounts,
  syncCards,
  syncTransactions,
  BANKS
};

