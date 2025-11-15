import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import './OAuthCallback.css';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [status, setStatus] = useState('Обработка...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('Ошибка авторизации');
      showNotification('Ошибка авторизации в банке', 'error');
      setTimeout(() => navigate('/profile'), 2000);
      return;
    }

    if (!code || !state) {
      setStatus('Отсутствуют необходимые параметры');
      showNotification('Ошибка: отсутствуют параметры авторизации', 'error');
      setTimeout(() => navigate('/profile'), 2000);
      return;
    }

    // Извлечь bankName из state (формат: userId_bankName)
    const parts = state.split('_');
    if (parts.length < 2) {
      setStatus('Неверный формат state');
      showNotification('Ошибка: неверный формат авторизации', 'error');
      setTimeout(() => navigate('/profile'), 2000);
      return;
    }

    const bankName = parts[parts.length - 1];

    // Отправить code на сервер для обмена на токены
    api.post('/banks/callback', {
      code,
      state,
      bankName
    })
      .then((response) => {
        setStatus('Банк успешно подключен!');
        showNotification('Банк успешно подключен', 'success');
        setTimeout(() => navigate('/profile'), 2000);
      })
      .catch((error) => {
        setStatus('Ошибка подключения банка');
        showNotification(
          error.response?.data?.message || 'Ошибка подключения банка',
          'error'
        );
        setTimeout(() => navigate('/profile'), 3000);
      });
  }, [searchParams, navigate, showNotification]);

  return (
    <div className="oauth-callback">
      <div className="oauth-callback-content">
        <h2>{status}</h2>
        <p>Пожалуйста, подождите...</p>
      </div>
    </div>
  );
}

export default OAuthCallback;

