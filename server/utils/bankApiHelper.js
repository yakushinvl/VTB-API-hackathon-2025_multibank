/**
 * Вспомогательные функции для работы с банковскими API
 * Прямые запросы с Basic Auth (без OAuth)
 */

const axios = require('axios');

/**
 * Получить client_id и client_secret
 */
function getBankCredentials() {
  return {
    clientId: process.env.BANK_CLIENT_ID || 'team264',
    clientSecret: process.env.BANK_CLIENT_SECRET || 'gRmcwJHKX9hccsqvG4PzqmdSRqCF9IZx'
  };
}

/**
 * Создать Basic Auth заголовок
 */
function createBasicAuthHeader(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Получить токен банка через POST /auth/bank-token
 * client_id и client_secret передаются как query параметры
 */
async function getBankToken(baseUrl) {
  const { clientId, clientSecret } = getBankCredentials();
  const url = `${baseUrl}/auth/bank-token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
  
  console.log(`[getBankToken] ==========================================`);
  console.log(`[getBankToken] ПОЛУЧЕНИЕ ТОКЕНА - POST ЗАПРОС ДЛЯ КОПИРОВАНИЯ:`);
  console.log(`[getBankToken] URL: ${url}`);
  console.log(`[getBankToken] Метод: POST`);
  console.log(`[getBankToken] Headers:`);
  console.log(`[getBankToken]   accept: application/json`);
  console.log(`[getBankToken] Body: '' (пустая строка)`);
  console.log(`[getBankToken] ==========================================`);

  try {
    // Отправляем пустое тело (пустая строка) с query параметрами
    const response = await axios.post(url, '', {
      headers: {
        'accept': 'application/json'
      },
      timeout: 30000
    });
    
    console.log(`[getBankToken] Токен получен успешно`);
    console.log(`[getBankToken] Ответ:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`[getBankToken] Ошибка получения токена:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    // Выводим полную информацию об ошибке валидации
    if (error.response?.data?.detail) {
      console.error(`[getBankToken] Детали ошибки валидации:`, JSON.stringify(error.response.data.detail, null, 2));
    }
    throw error;
  }
}

/**
 * Выполнить запрос к банковскому API с токеном
 */
async function makeApiRequest(url, method = 'GET', data = null, token = null) {
  const { clientId, clientSecret } = getBankCredentials();
  
  // Добавляем client_id в URL как query параметр
  const urlObj = new URL(url);
  urlObj.searchParams.set('client_id', clientId);
  const urlWithClientId = urlObj.toString();
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Id': clientId,  // Добавляем client_id в заголовок
    'client_id': clientId     // Также пробуем в обычном заголовке
  };

  // Если есть токен, используем Bearer, иначе Basic Auth
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const authHeader = createBasicAuthHeader(clientId, clientSecret);
    headers['Authorization'] = authHeader;
  }

  const config = {
    method,
    url: urlWithClientId,
    headers,
    timeout: 30000
  };

  if (data) {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      config.data = data;
    } else if (method === 'GET') {
      config.params = data;
    }
  }

  try {
    console.log(`[makeApiRequest] ==========================================`);
    console.log(`[makeApiRequest] ВЫПОЛНЯЮ ЗАПРОС К БАНКОВСКОМУ API`);
    console.log(`[makeApiRequest] ==========================================`);
    console.log(`[makeApiRequest] URL (с client_id): ${urlWithClientId}`);
    console.log(`[makeApiRequest] Метод: ${method}`);
    console.log(`[makeApiRequest] Headers:`);
    if (token) {
      console.log(`[makeApiRequest]   Authorization: Bearer ${token}`);
    } else {
      console.log(`[makeApiRequest]   Authorization: Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`);
    }
    console.log(`[makeApiRequest]   X-Client-Id: ${clientId}`);
    console.log(`[makeApiRequest]   client_id: ${clientId}`);
    console.log(`[makeApiRequest]   Accept: application/json`);
    console.log(`[makeApiRequest]   Content-Type: application/json`);
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      console.log(`[makeApiRequest] Body:`, JSON.stringify(data, null, 2));
    } else if (data && method === 'GET') {
      console.log(`[makeApiRequest] Query params:`, JSON.stringify(data, null, 2));
    }
    console.log(`[makeApiRequest] ==========================================`);
    
    const response = await axios(config);
    
    console.log(`[makeApiRequest] ==========================================`);
    console.log(`[makeApiRequest] УСПЕШНЫЙ ОТВЕТ ОТ API`);
    console.log(`[makeApiRequest] ==========================================`);
    console.log(`[makeApiRequest] Статус: ${response.status} ${response.statusText}`);
    console.log(`[makeApiRequest] Headers ответа:`, JSON.stringify(response.headers, null, 2));
    console.log(`[makeApiRequest] Тело ответа:`, JSON.stringify(response.data, null, 2));
    console.log(`[makeApiRequest] ==========================================`);
    
    return response.data;
  } catch (error) {
    console.error(`[makeApiRequest] ==========================================`);
    console.error(`[makeApiRequest] ОШИБКА ЗАПРОСА К API`);
    console.error(`[makeApiRequest] ==========================================`);
    console.error(`[makeApiRequest] URL (с client_id): ${urlWithClientId}`);
    console.error(`[makeApiRequest] Метод: ${method}`);
    console.error(`[makeApiRequest] Статус ошибки: ${error.response?.status} ${error.response?.statusText}`);
    console.error(`[makeApiRequest] Данные ошибки:`, JSON.stringify(error.response?.data, null, 2));
    console.error(`[makeApiRequest] Сообщение: ${error.message}`);
    console.error(`[makeApiRequest] ==========================================`);
    
    const errorInfo = {
      url,
      method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    };
    
    throw error;
  }
}

module.exports = {
  getBankCredentials,
  createBasicAuthHeader,
  getBankToken,
  makeApiRequest
};
