import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './Detail.css';

function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccount();
    loadTransactions();
  }, [id]);

  const loadAccount = async () => {
    try {
      const response = await api.get(`/accounts/${id}`);
      setAccount(response.data.account);
    } catch (error) {
      console.error('Ошибка загрузки счета:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const limit = expanded ? null : 5;
      const response = await api.get(`/accounts/${id}/transactions`, {
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

  const getBankIcon = (bankName) => {
    const icons = {
      vbank: '🏦',
      abank: '🏛️',
      sbank: '🏪'
    };
    return icons[bankName?.toLowerCase()] || '🏦';
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!account) {
    return <div className="container">Счет не найден</div>;
  }

  return (
    <div className="container">
      <h1>Информация о счете</h1>

      <div className="detail-card">
        <div className="detail-header">
          <span className="bank-icon-large">{getBankIcon(account.bank_name)}</span>
          <div>
            <h2>{account.account_number}</h2>
            <div className="detail-meta">
              {account.bank_name}
              {account.bank_domain && ` • ${account.bank_domain}`}
            </div>
          </div>
        </div>

        <div className="detail-balance">
          <div className="balance-label">Баланс</div>
          <div className="balance-value">{formatAmount(account.balance)}</div>
        </div>

        <div className="detail-info">
          <div className="info-item">
            <span className="info-label">Тип счета:</span>
            <span className="info-value">{account.account_type}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Валюта:</span>
            <span className="info-value">{account.currency}</span>
          </div>
          {account.last_sync && (
            <div className="info-item">
              <span className="info-label">Последняя синхронизация:</span>
              <span className="info-value">
                {new Date(account.last_sync).toLocaleString('ru-RU')}
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

export default AccountDetail;

