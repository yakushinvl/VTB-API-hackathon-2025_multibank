const axios = require('axios');
const { getDB } = require('../models/database');
const { makeApiRequest, getBankToken } = require('../utils/bankApiHelper');

// Конфигурация банков
const BANKS = {
  vbank: {
    name: 'VBank',
    domain: 'vbank.open.bankingapi.ru',
    baseUrl: 'https://vbank.open.bankingapi.ru'
  },
  abank: {
    name: 'ABank',
    domain: 'abank.open.bankingapi.ru',
    baseUrl: 'https://abank.open.bankingapi.ru'
  },
  sbank: {
    name: 'SBank',
    domain: 'sbank.open.bankingapi.ru',
    baseUrl: 'https://sbank.open.bankingapi.ru'
  }
};

// Получить конфигурацию банка
function getBankConfig(bankName) {
  return BANKS[bankName.toLowerCase()];
}

// Получить или обновить токен для банка
async function getOrRefreshBankToken(bankConfig, connectionId) {
  const db = getDB();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT access_token, token_expires_at FROM bank_connections WHERE id = ?',
      [connectionId],
      async (err, connection) => {
        if (err) {
          reject(err);
          return;
        }

        // Проверяем, есть ли валидный токен
        if (connection && connection.access_token && connection.access_token !== '') {
          const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
          const now = new Date();
          
          // Если токен еще не истек (или нет даты истечения), используем его
          if (!expiresAt || expiresAt > now) {
            console.log(`[getOrRefreshBankToken] Используем существующий токен`);
            resolve(connection.access_token);
            return;
          }
        }

        // Получаем новый токен
        try {
          console.log(`[getOrRefreshBankToken] Получаем новый токен для ${bankConfig.name}`);
          const tokenResponse = await getBankToken(bankConfig.baseUrl);
          const token = tokenResponse.access_token; // API возвращает access_token
          
          console.log(`[getOrRefreshBankToken] ==========================================`);
          console.log(`[getOrRefreshBankToken] ПОЛУЧЕННЫЙ ТОКЕН ОТ БАНКА:`);
          console.log(`[getOrRefreshBankToken] ${token}`);
          console.log(`[getOrRefreshBankToken] Полный ответ от API:`, JSON.stringify(tokenResponse));
          console.log(`[getOrRefreshBankToken] ==========================================`);
          
          if (!token) {
            console.error(`[getOrRefreshBankToken] Токен не найден в ответе:`, tokenResponse);
            reject(new Error('Токен не получен от банка'));
            return;
          }

          // Сохраняем токен в БД
          const expiresAt = tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // По умолчанию 24 часа

          db.run(
            'UPDATE bank_connections SET access_token = ?, token_expires_at = ? WHERE id = ?',
            [token, expiresAt, connectionId],
            (err) => {
              if (err) {
                console.error(`[getOrRefreshBankToken] Ошибка сохранения токена:`, err);
                // Все равно возвращаем токен, даже если не сохранился
                resolve(token);
              } else {
                console.log(`[getOrRefreshBankToken] Токен сохранен в БД`);
                resolve(token);
              }
            }
          );
        } catch (tokenError) {
          console.error(`[getOrRefreshBankToken] Ошибка получения токена:`, tokenError);
          reject(tokenError);
        }
      }
    );
  });
}

// API запрос к банку (использует токен)
async function makeBankRequest(userId, bankConnectionId, endpoint, method = 'GET', data = null) {
  try {
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name FROM bank_connections WHERE id = ? AND user_id = ?',
        [bankConnectionId, userId],
        async (err, connection) => {
          if (err) {
            console.error(`[makeBankRequest] Ошибка получения подключения:`, err);
            reject(err);
            return;
          }
          if (!connection) {
            console.error(`[makeBankRequest] Подключение не найдено: userId=${userId}, connectionId=${bankConnectionId}`);
            reject(new Error('Подключение не найдено'));
            return;
          }

          const bankConfig = getBankConfig(connection.bank_name);
          if (!bankConfig) {
            console.error(`[makeBankRequest] Банк не найден: ${connection.bank_name}`);
            reject(new Error('Банк не найден'));
            return;
          }

          // Получаем токен
          let token;
          try {
            token = await getOrRefreshBankToken(bankConfig, bankConnectionId);
            console.log(`[makeBankRequest] ==========================================`);
            console.log(`[makeBankRequest] ИСПОЛЬЗУЕМЫЙ ТОКЕН ДЛЯ ЗАПРОСА:`);
            console.log(`[makeBankRequest] ${token}`);
            console.log(`[makeBankRequest] ==========================================`);
          } catch (tokenError) {
            console.error(`[makeBankRequest] Ошибка получения токена:`, tokenError);
            reject(new Error(`Ошибка получения токена: ${tokenError.message}`));
            return;
          }

          const url = `${bankConfig.baseUrl}${endpoint}`;
          console.log(`[makeBankRequest] Запрос к ${connection.bank_name}: ${method} ${url}`);

          try {
            const responseData = await makeApiRequest(url, method, data, token);
            console.log(`[makeBankRequest] Успешный ответ от ${connection.bank_name}${endpoint}:`, 
              typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 300) : responseData);
            resolve(responseData);
          } catch (error) {
            // Логируем ошибку для отладки
            const errorDetails = {
              url,
              method,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              message: error.message
            };
            console.error(`[makeBankRequest] Ошибка запроса к банку ${connection.bank_name}:`, errorDetails);
            
            // Создаем более информативную ошибку
            const apiError = new Error(error.response?.data?.message || error.response?.data?.detail || error.message || 'Ошибка запроса к API банка');
            apiError.status = error.response?.status;
            apiError.response = error.response;
            reject(apiError);
          }
        }
      );
    });
  } catch (error) {
    console.error(`[makeBankRequest] Критическая ошибка:`, error);
    throw error;
  }
}

// Синхронизация счетов
async function syncAccounts(userId, bankConnectionId) {
  try {
    console.log(`[syncAccounts] ==========================================`);
    console.log(`[syncAccounts] НАЧИНАЕМ СИНХРОНИЗАЦИЮ СЧЕТОВ`);
    console.log(`[syncAccounts] ==========================================`);
    console.log(`[syncAccounts] userId: ${userId}`);
    console.log(`[syncAccounts] bankConnectionId: ${bankConnectionId}`);
    console.log(`[syncAccounts] ==========================================`);
    
    let accountsData;
    try {
      accountsData = await makeBankRequest(userId, bankConnectionId, '/accounts');
      console.log(`[syncAccounts] ==========================================`);
      console.log(`[syncAccounts] ПОЛУЧЕНЫ ДАННЫЕ ОТ API`);
      console.log(`[syncAccounts] ==========================================`);
      console.log(`[syncAccounts] Данные:`, JSON.stringify(accountsData, null, 2));
      console.log(`[syncAccounts] ==========================================`);
    } catch (apiError) {
      console.error(`[syncAccounts] Ошибка запроса к API:`, {
        message: apiError.message,
        status: apiError.status,
        response: apiError.response?.data
      });
      throw apiError;
    }
    
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name, bank_domain FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        (err, connection) => {
          if (err) {
            console.error(`[syncAccounts] Ошибка получения подключения:`, err);
            reject(err);
            return;
          }

          if (!connection) {
            console.error(`[syncAccounts] Подключение не найдено для connectionId=${bankConnectionId}`);
            reject(new Error('Подключение не найдено'));
            return;
          }

          // Обрабатываем разные форматы ответа
          let accounts = [];
          if (!accountsData) {
            console.log(`[syncAccounts] accountsData пуст или undefined`);
          } else if (Array.isArray(accountsData)) {
            accounts = accountsData;
          } else if (accountsData.accounts && Array.isArray(accountsData.accounts)) {
            accounts = accountsData.accounts;
          } else if (accountsData.data && Array.isArray(accountsData.data)) {
            accounts = accountsData.data;
          } else if (accountsData.items && Array.isArray(accountsData.items)) {
            accounts = accountsData.items;
          } else if (typeof accountsData === 'object') {
            // Если это объект, но не массив, попробуем найти любые массивы внутри
            console.log(`[syncAccounts] Неожиданный формат данных, ищем массивы:`, Object.keys(accountsData));
            for (const key in accountsData) {
              if (Array.isArray(accountsData[key])) {
                accounts = accountsData[key];
                console.log(`[syncAccounts] Найден массив в поле "${key}"`);
                break;
              }
            }
          }
          
          console.log(`[syncAccounts] Обрабатываем ${accounts.length} счетов`);
          if (accounts.length === 0 && accountsData) {
            console.log(`[syncAccounts] ВНИМАНИЕ: Получены данные, но массив счетов пуст. Полные данные:`, JSON.stringify(accountsData));
          }
          
          let processed = 0;
          const errors = [];

          if (accounts.length === 0) {
            console.log(`[syncAccounts] Нет счетов для синхронизации`);
            resolve({ synced: 0, errors: [] });
            return;
          }

          accounts.forEach((account, index) => {
            const accountId = account.id || account.account_id;
            const accountNumber = account.number || account.account_number;
            const accountType = account.type || account.account_type || 'debit';
            const balance = account.balance || 0;
            const currency = account.currency || 'RUB';

            console.log(`[syncAccounts] Обрабатываем счет ${index + 1}/${accounts.length}: id=${accountId}, number=${accountNumber}, type=${accountType}, balance=${balance}`);

            db.run(
              `INSERT OR REPLACE INTO accounts 
               (user_id, bank_connection_id, account_id, account_number, account_type, balance, currency, bank_name, bank_domain, last_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                bankConnectionId,
                accountId,
                accountNumber,
                accountType,
                balance,
                currency,
                connection.bank_name,
                connection.bank_domain
              ],
              (err) => {
                processed++;
                if (err) {
                  console.error(`[syncAccounts] Ошибка сохранения счета ${accountId}:`, err);
                  errors.push({ account: accountId, error: err.message });
                } else {
                  console.log(`[syncAccounts] Счет ${accountId} успешно сохранен`);
                }
                if (processed === accounts.length) {
                  console.log(`[syncAccounts] Синхронизация завершена: ${accounts.length - errors.length}/${accounts.length} успешно`);
                  resolve({ synced: accounts.length - errors.length, errors });
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    console.error(`[syncAccounts] Критическая ошибка:`, error);
    throw error;
  }
}

// Синхронизация карт
async function syncCards(userId, bankConnectionId) {
  try {
    console.log(`[syncCards] ==========================================`);
    console.log(`[syncCards] НАЧИНАЕМ СИНХРОНИЗАЦИЮ КАРТ`);
    console.log(`[syncCards] ==========================================`);
    console.log(`[syncCards] userId: ${userId}`);
    console.log(`[syncCards] bankConnectionId: ${bankConnectionId}`);
    console.log(`[syncCards] ==========================================`);
    
    // Получаем договоры с продуктами (карты)
    let agreementsData;
    try {
      agreementsData = await makeBankRequest(userId, bankConnectionId, '/product-agreements', 'GET');
      console.log(`[syncCards] ==========================================`);
      console.log(`[syncCards] ПОЛУЧЕНЫ ДАННЫЕ ОТ API`);
      console.log(`[syncCards] ==========================================`);
      console.log(`[syncCards] Данные:`, JSON.stringify(agreementsData, null, 2));
      console.log(`[syncCards] ==========================================`);
    } catch (apiError) {
      console.error(`[syncCards] Ошибка запроса к API:`, {
        message: apiError.message,
        status: apiError.status,
        response: apiError.response?.data
      });
      throw apiError;
    }
    
    // Обрабатываем разные форматы ответа
    let agreements = [];
    if (Array.isArray(agreementsData)) {
      agreements = agreementsData;
    } else if (agreementsData.agreements && Array.isArray(agreementsData.agreements)) {
      agreements = agreementsData.agreements;
    } else if (agreementsData.data && Array.isArray(agreementsData.data)) {
      agreements = agreementsData.data;
    } else if (agreementsData.items && Array.isArray(agreementsData.items)) {
      agreements = agreementsData.items;
    }
    
    // Фильтруем только карты
    let cardsData = agreements.filter(agreement => {
      const productType = agreement.product_type || agreement.product?.type || agreement.type || '';
      const productName = agreement.product?.name || agreement.name || '';
      const typeStr = (productType + ' ' + productName).toLowerCase();
      return typeStr.includes('card') || typeStr.includes('карта') || typeStr.includes('card');
    });
    
    // Если не нашли карты, но есть договоры, попробуем использовать все договоры как карты
    if (cardsData.length === 0 && agreements.length > 0) {
      console.log(`[syncCards] Не найдено карт по фильтру, используем все договоры как карты`);
      cardsData = agreements;
    }
    
    console.log(`[syncCards] Найдено ${cardsData.length} карт из ${agreements.length} договоров`);
    if (cardsData.length === 0 && agreements.length > 0) {
      console.log(`[syncCards] ВНИМАНИЕ: Есть договоры, но карты не найдены. Пример договора:`, JSON.stringify(agreements[0]).substring(0, 300));
    }
    console.log(`[syncCards] Получены данные от API:`, JSON.stringify(cardsData).substring(0, 200));
    
    const db = getDB();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT bank_name, bank_domain FROM bank_connections WHERE id = ?',
        [bankConnectionId],
        (err, connection) => {
          if (err) {
            console.error(`[syncCards] Ошибка получения подключения:`, err);
            reject(err);
            return;
          }

          if (!connection) {
            console.error(`[syncCards] Подключение не найдено для connectionId=${bankConnectionId}`);
            reject(new Error('Подключение не найдено'));
            return;
          }

          console.log(`[syncCards] Обрабатываем ${cardsData.length} карт`);
          
          let processed = 0;
          const errors = [];

          if (cardsData.length === 0) {
            console.log(`[syncCards] Нет карт для синхронизации`);
            resolve({ synced: 0, errors: [] });
            return;
          }

          cardsData.forEach((agreement, index) => {
            // Извлекаем данные карты из договора
            const cardId = agreement.id || agreement.agreement_id || agreement.product_id || agreement.product?.id;
            const product = agreement.product || {};
            const cardNumber = product.number || product.card_number || agreement.card_number || product.account_number || agreement.account_number || '';
            const cardType = product.type || agreement.product_type || product.product_type || 'debit';
            const expiryDate = product.expiry_date || agreement.expiry_date || product.expiryDate;
            const cvv = product.cvv || agreement.cvv || product.cvv_code;

            console.log(`[syncCards] Обрабатываем карту ${index + 1}/${cardsData.length}: id=${cardId}, number=${cardNumber}, type=${cardType}`);
            console.log(`[syncCards] Полные данные договора:`, JSON.stringify(agreement).substring(0, 300));

            db.run(
              `INSERT OR REPLACE INTO cards 
               (user_id, bank_connection_id, card_id, card_number, card_type, expiry_date, cvv, bank_name, bank_domain, last_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                bankConnectionId,
                cardId,
                cardNumber,
                cardType,
                expiryDate,
                cvv,
                connection.bank_name,
                connection.bank_domain
              ],
              (err) => {
                processed++;
                if (err) {
                  console.error(`[syncCards] Ошибка сохранения карты ${cardId}:`, err);
                  errors.push({ card: cardId, error: err.message });
                } else {
                  console.log(`[syncCards] Карта ${cardId} успешно сохранена`);
                }
                if (processed === cardsData.length) {
                  console.log(`[syncCards] Синхронизация завершена: ${cardsData.length - errors.length}/${cardsData.length} успешно`);
                  resolve({ synced: cardsData.length - errors.length, errors });
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    console.error(`[syncCards] Критическая ошибка:`, error);
    throw error;
  }
}

// Синхронизация транзакций
async function syncTransactions(userId, bankConnectionId, accountId = null, cardId = null) {
  try {
    let endpoint = '/accounts/transactions';
    if (accountId) {
      endpoint = `/accounts/${accountId}/transactions`;
    } else if (cardId) {
      // Для карт транзакции могут быть через product-agreements
      endpoint = `/product-agreements/${cardId}/transactions`;
    }

    const transactionsData = await makeBankRequest(userId, bankConnectionId, endpoint, 'GET');
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
  makeBankRequest,
  syncAccounts,
  syncCards,
  syncTransactions,
  BANKS
};
