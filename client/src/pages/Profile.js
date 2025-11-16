import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Profile.css';

function Profile() {
  const { user, checkAuth } = useAuth();
  const { showNotification } = useNotifications();
  const [profile, setProfile] = useState(null);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [availableBanks, setAvailableBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
    loadBanks();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data.user);
      setConnectedBanks(response.data.user.connectedBanks || []);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const response = await api.get('/banks/available');
      setAvailableBanks(response.data.banks || []);
    } catch (error) {
      console.error('Ошибка загрузки банков:', error);
    }
  };

  const handleThemeChange = async (theme) => {
    try {
      await api.put('/user/profile', { theme });
      setProfile(prev => ({ ...prev, theme }));
      checkAuth();
      document.body.className = theme === 'dark' ? 'dark' : '';
      showNotification('Тема изменена', 'success');
    } catch (error) {
      console.error('Ошибка изменения темы:', error);
      showNotification('Ошибка изменения темы', 'error');
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      await api.put('/user/profile', { language });
      setProfile(prev => ({ ...prev, language }));
      checkAuth();
      document.documentElement.lang = language;
      showNotification('Язык изменен', 'success');
    } catch (error) {
      console.error('Ошибка изменения языка:', error);
      showNotification('Ошибка изменения языка', 'error');
    }
  };

  const handleConnectBank = async (bankName) => {
    try {
      const response = await api.post(`/banks/connect/${bankName}`);
      const message = response.data.syncResults 
        ? `${response.data.message} (Синхронизировано: ${response.data.syncResults.accounts} счетов, ${response.data.syncResults.cards} карт)`
        : response.data.message || 'Банк успешно подключен';
      showNotification(message, 'success');
      loadProfile(); // Перезагружаем профиль для обновления списка подключенных банков
    } catch (error) {
      console.error('Ошибка подключения банка:', error);
      showNotification(error.response?.data?.message || 'Ошибка подключения банка', 'error');
    }
  };

  const handleSyncBank = async (connectionId) => {
    try {
      console.log(`[handleSyncBank] Начинаем синхронизацию для connectionId=${connectionId}`);
      console.log(`[handleSyncBank] Запрос к /api/accounts/sync с body:`, { bankConnectionId: connectionId });
      console.log(`[handleSyncBank] Запрос к /api/cards/sync с body:`, { bankConnectionId: connectionId });
      
      showNotification('Синхронизация данных...', 'info');
      const [accountsRes, cardsRes] = await Promise.allSettled([
        api.post('/accounts/sync', { bankConnectionId: connectionId }),
        api.post('/cards/sync', { bankConnectionId: connectionId })
      ]);
      
      console.log(`[handleSyncBank] Результат синхронизации счетов:`, accountsRes);
      console.log(`[handleSyncBank] Результат синхронизации карт:`, cardsRes);
      
      if (accountsRes.status === 'rejected') {
        console.error('[handleSyncBank] Ошибка синхронизации счетов:', accountsRes.reason);
        console.error('[handleSyncBank] Детали ошибки счетов:', accountsRes.reason?.response?.data);
      }
      if (cardsRes.status === 'rejected') {
        console.error('[handleSyncBank] Ошибка синхронизации карт:', cardsRes.reason);
        console.error('[handleSyncBank] Детали ошибки карт:', cardsRes.reason?.response?.data);
      }
      
      const accountsSynced = accountsRes.status === 'fulfilled' ? accountsRes.value.data.synced || 0 : 0;
      const cardsSynced = cardsRes.status === 'fulfilled' ? cardsRes.value.data.synced || 0 : 0;
      
      console.log(`[handleSyncBank] Синхронизировано: ${accountsSynced} счетов, ${cardsSynced} карт`);
      
      showNotification(`Синхронизация завершена: ${accountsSynced} счетов, ${cardsSynced} карт`, 'success');
      loadProfile();
    } catch (error) {
      console.error('[handleSyncBank] Критическая ошибка синхронизации:', error);
      console.error('[handleSyncBank] Детали ошибки:', error.response?.data);
      showNotification('Ошибка синхронизации данных', 'error');
    }
  };

  const handleDisconnectBank = async (connectionId) => {
    try {
      await api.delete(`/banks/${connectionId}`);
      loadProfile();
      showNotification('Банк успешно отключен', 'success');
    } catch (error) {
      console.error('Ошибка отключения банка:', 'error');
      showNotification('Ошибка отключения банка', 'error');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Пароли не совпадают', 'error');
      return;
    }

    try {
      await api.put('/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      showNotification('Пароль успешно изменен', 'success');
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      showNotification(error.response?.data?.message || 'Ошибка изменения пароля', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!profile) {
    return <div className="loading">Профиль не найден</div>;
  }

  return (
    <div className="container">
      <h1>Профиль</h1>

      {/* Информация о пользователе */}
      <section className="profile-section">
        <h2>Личная информация</h2>
        <div className="profile-field">
          <label className="profile-label">Логин</label>
          <div className="profile-value">{profile.username}</div>
        </div>
        <div className="profile-field">
          <label className="profile-label">Email</label>
          <div className="profile-value">{profile.email}</div>
        </div>
      </section>

      {/* Изменение пароля */}
      <section className="profile-section">
        <h2>Безопасность</h2>
        {!showPasswordForm ? (
          <button
            className="btn btn-primary"
            onClick={() => setShowPasswordForm(true)}
          >
            Изменить пароль
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label className="form-label">Текущий пароль</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Новый пароль</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Подтверждение пароля</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Сохранить</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Подключенные банки */}
      <section className="profile-section">
        <h2>Подключенные банки</h2>
        {connectedBanks.length > 0 ? (
          <ul className="banks-list">
            {connectedBanks.map((bank) => (
              <li key={bank.id} className="bank-item">
                <div>
                  <div className="bank-name">{bank.bank_name}</div>
                  {bank.bank_domain && (
                    <div className="bank-domain">{bank.bank_domain}</div>
                  )}
                  <div className="bank-date">
                    Подключен: {new Date(bank.connected_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSyncBank(bank.id)}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Синхронизировать
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDisconnectBank(bank.id)}
                  >
                    Отключить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">Нет подключенных банков</p>
        )}

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Доступные банки</h3>
        <div className="available-banks">
          {availableBanks.map((bank) => {
            const isConnected = connectedBanks.some(b => b.bank_name === bank.name);
            return (
              <div key={bank.id} className="bank-card">
                <div className="bank-info">
                  <div className="bank-name">{bank.name}</div>
                  {bank.domain && (
                    <div className="bank-domain">{bank.domain}</div>
                  )}
                </div>
                <button
                  className={`btn ${isConnected ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleConnectBank(bank.id)}
                  disabled={isConnected}
                >
                  {isConnected ? 'Подключен' : 'Подключить'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Настройки приложения */}
      <section className="profile-section">
        <h2>Настройки приложения</h2>
        <div className="profile-field">
          <label className="profile-label">Тема</label>
          <div className="settings-options">
            <button
              className={`btn ${profile.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleThemeChange('light')}
            >
              Светлая
            </button>
            <button
              className={`btn ${profile.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleThemeChange('dark')}
            >
              Темная
            </button>
          </div>
        </div>
        <div className="profile-field">
          <label className="profile-label">Язык</label>
          <div className="settings-options">
            <button
              className={`btn ${profile.language === 'ru' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleLanguageChange('ru')}
            >
              Русский
            </button>
            <button
              className={`btn ${profile.language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;

