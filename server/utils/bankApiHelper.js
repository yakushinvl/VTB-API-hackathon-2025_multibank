/**
 * Вспомогательные функции для работы с банковскими API
 * Согласно стандартам Open Banking API и OAuth 2.0
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
 * Отправить POST запрос для получения токена
 * Поддерживает оба варианта: Basic Auth и передача в теле
 */
async function requestToken(tokenUrl, params, useBasicAuth = true) {
  const querystring = require('querystring');
  const { clientId, clientSecret } = getBankCredentials();
  
  const tokenData = querystring.stringify(params);
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  };

  // Некоторые API требуют Basic Auth
  if (useBasicAuth) {
    headers['Authorization'] = createBasicAuthHeader(clientId, clientSecret);
  }

  try {
    const response = await axios.post(tokenUrl, tokenData, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status < 500 // Не выбрасывать ошибку для 4xx
    });

    if (response.status >= 400) {
      // Если получили 401 с Basic Auth, пробуем без него
      if (useBasicAuth && response.status === 401) {
        return requestToken(tokenUrl, params, false);
      }
      throw new Error(`Ошибка получения токена: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    return response.data;
  } catch (error) {
    // Если ошибка и использовали Basic Auth, пробуем без него
    if (useBasicAuth && error.response?.status === 401) {
      return requestToken(tokenUrl, params, false);
    }
    throw error;
  }
}

/**
 * Обмен authorization code на токены
 */
async function exchangeCodeForTokens(tokenUrl, code, redirectUri) {
  const { clientId, clientSecret } = getBankCredentials();
  
  return requestToken(tokenUrl, {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });
}

/**
 * Обновление токена доступа
 */
async function refreshToken(tokenUrl, refreshToken) {
  const { clientId, clientSecret } = getBankCredentials();
  
  return requestToken(tokenUrl, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });
}

/**
 * Выполнить запрос к банковскому API
 */
async function makeApiRequest(url, method, token, data = null) {
  const config = {
    method,
    url,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
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
    const response = await axios(config);
    return response.data;
  } catch (error) {
    const errorInfo = {
      url,
      method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    };
    
    console.error('Ошибка запроса к банковскому API:', errorInfo);
    throw error;
  }
}

module.exports = {
  getBankCredentials,
  createBasicAuthHeader,
  requestToken,
  exchangeCodeForTokens,
  refreshToken,
  makeApiRequest
};

