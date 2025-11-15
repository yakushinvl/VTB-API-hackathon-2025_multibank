import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Assistant.css';

function Assistant() {
  const { user, checkAuth } = useAuth();
  const { showNotification } = useNotifications();
  const [analysis, setAnalysis] = useState(null);
  const [cashback, setCashback] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.subscription_active) {
      loadAnalysis();
      loadCashback();
    }
  }, [user]);

  const loadAnalysis = async () => {
    try {
      const response = await api.get('/assistant/analysis');
      setAnalysis(response.data);
    } catch (error) {
      console.error('Ошибка загрузки анализа:', error);
    }
  };

  const loadCashback = async () => {
    try {
      const response = await api.get('/assistant/cashback');
      setCashback(response.data);
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций по кэшбэку:', error);
    }
  };

  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = question;
    setQuestion('');
    setChatMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/assistant/chat', { question: userMessage });
      setChatMessages(prev => [...prev, { type: 'assistant', text: response.data.answer }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        type: 'assistant', 
        text: 'Извините, произошла ошибка. Попробуйте позже.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const handleSubscribe = async () => {
    try {
      const response = await api.post('/user/subscribe');
      showNotification('Подписка успешно активирована!', 'success');
      checkAuth(); // Обновить данные пользователя
    } catch (error) {
      showNotification(error.response?.data?.message || 'Ошибка активации подписки', 'error');
    }
  };

  if (!user?.subscription_active) {
    return (
      <div className="container">
        <div className="subscription-required">
          <h2>Требуется подписка</h2>
          <p>Функция ИИ-помощника доступна только для пользователей с активной подпиской.</p>
          <div className="subscription-features">
            <h3>С подпиской вы получите:</h3>
            <ul>
              <li>✓ Детальный анализ ваших трат</li>
              <li>✓ Персонализированные рекомендации</li>
              <li>✓ Оптимизация кэшбэка</li>
              <li>✓ ИИ-помощник для финансового планирования</li>
            </ul>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '20px' }}
              onClick={handleSubscribe}
            >
              Оформить подписку
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>ИИ Помощник</h1>

      {/* Анализ трат */}
      {analysis && (
        <section className="assistant-section">
          <h2>Анализ трат</h2>
          <div className="analysis-stats">
            <div className="stat-item">
              <div className="stat-label">Расходы</div>
              <div className="stat-value negative">
                {formatAmount(analysis.statistics.totalExpenses)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Доходы</div>
              <div className="stat-value positive">
                {formatAmount(analysis.statistics.totalIncome)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Баланс</div>
              <div className={`stat-value ${analysis.statistics.balance >= 0 ? 'positive' : 'negative'}`}>
                {formatAmount(analysis.statistics.balance)}
              </div>
            </div>
          </div>

          {analysis.statistics.categoryStats && analysis.statistics.categoryStats.length > 0 && (
            <div className="category-stats">
              <h3>Траты по категориям</h3>
              {analysis.statistics.categoryStats.map((cat, index) => (
                <div key={index} className="category-item">
                  <div className="category-name">{cat.category}</div>
                  <div className="category-amount">{formatAmount(cat.expenses)} ({cat.percentage}%)</div>
                </div>
              ))}
            </div>
          )}

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="recommendations">
              <h3>Рекомендации</h3>
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation-item ${rec.type}`}>
                  <div className="recommendation-title">{rec.title}</div>
                  <div className="recommendation-message">{rec.message}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Рекомендации по кэшбэку */}
      {cashback && cashback.recommendations && cashback.recommendations.length > 0 && (
        <section className="assistant-section">
          <h2>Рекомендации по кэшбэку</h2>
          <div className="cashback-recommendations">
            {cashback.recommendations.map((rec, index) => (
              <div key={index} className="cashback-item">
                <div className="cashback-category">{rec.category}</div>
                <div className="cashback-info">
                  <div>Рекомендация: {rec.recommendation}</div>
                  <div>Ставка кэшбэка: {rec.cashbackRate}</div>
                  <div>Потенциальный кэшбэк: {formatAmount(rec.potentialCashback)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Чат с помощником */}
      <section className="assistant-section">
        <h2>Задать вопрос</h2>
        <div className="assistant-chat">
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div className="welcome-message">
                Задайте вопрос о ваших финансах, и я помогу вам с анализом и рекомендациями.
              </div>
            )}
            {chatMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="message assistant">Думаю...</div>
            )}
          </div>
          <form className="chat-input" onSubmit={handleSendQuestion}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задайте вопрос..."
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Отправить
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Assistant;

