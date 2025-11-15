import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './Detail.css';

function CardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCard();
    loadTransactions();
  }, [id]);

  const loadCard = async () => {
    try {
      const response = await api.get(`/cards/${id}`, {
        params: { showCvv: showCvv }
      });
      setCard(response.data.card);
    } catch (error) {
      console.error('Ошибка загрузки карты:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const limit = expanded ? null : 5;
      const response = await api.get(`/cards/${id}/transactions`, {
        params: { limit, expand: expanded }
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [expanded]);

  useEffect(() => {
    if (showCvv) {
      loadCard();
    }
  }, [showCvv]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatCardNumber = (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!card) {
    return <div className="container">Карта не найдена</div>;
  }

  return (
    <div className="container">
      <h1>Информация о карте</h1>

      <div className="detail-card">
        <div className="detail-header">
          <span className="bank-icon-large">💳</span>
          <div>
            <h2>{formatCardNumber(card.card_number)}</h2>
            <div className="detail-meta">
              {card.bank_name}
              {card.bank_domain && ` • ${card.bank_domain}`}
            </div>
          </div>
        </div>

        <div className="detail-info">
          <div className="info-item">
            <span className="info-label">Тип карты:</span>
            <span className="info-value">{card.card_type}</span>
          </div>
          {card.expiry_date && (
            <div className="info-item">
              <span className="info-label">Дата валидности:</span>
              <span className="info-value">{card.expiry_date}</span>
            </div>
          )}
          {card.cvv && (
            <div className="info-item">
              <span className="info-label">CVC/CVV:</span>
              <span className="info-value">
                {showCvv ? card.cvv : '***'}
                {!showCvv && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowCvv(true)}
                    style={{ marginLeft: '10px' }}
                  >
                    Показать
                  </button>
                )}
              </span>
            </div>
          )}
          {card.last_sync && (
            <div className="info-item">
              <span className="info-label">Последняя синхронизация:</span>
              <span className="info-value">
                {new Date(card.last_sync).toLocaleString('ru-RU')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-card">
        <h2>Транзакции</h2>
        {transactions.length > 0 ? (
          <>
            <ul className="transactions-list">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-description">
                      {transaction.description || 'Без описания'}
                    </div>
                    <div className="transaction-date">
                      {formatDate(transaction.transaction_date)}
                    </div>
                    {transaction.category && (
                      <div className="transaction-category">
                        {transaction.category}
                      </div>
                    )}
                  </div>
                  <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                    {formatAmount(transaction.amount)}
                  </div>
                </li>
              ))}
            </ul>
            {!expanded && (
              <button
                className="btn btn-primary expand-button"
                onClick={() => setExpanded(true)}
              >
                Развернуть
              </button>
            )}
          </>
        ) : (
          <p className="empty-message">Нет транзакций</p>
        )}
      </div>
    </div>
  );
}

export default CardDetail;

