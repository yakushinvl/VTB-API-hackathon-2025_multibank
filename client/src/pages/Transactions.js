import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Transactions.css';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [filters, setFilters] = useState({
    accountId: '',
    cardId: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadData = async () => {
    try {
      const [accountsRes, cardsRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/cards')
      ]);
      setAccounts(accountsRes.data.accounts || []);
      setCards(cardsRes.data.cards || []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.accountId) params.accountId = filters.accountId;
      if (filters.cardId) params.cardId = filters.cardId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get('/transactions', { params });
      setTransactions(response.data.transactions || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading && !stats) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1>Транзакции</h1>

      {/* Статистика за текущий месяц */}
      {stats && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Транзакций за месяц</div>
            <div className="stat-value">{stats.count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Расходы</div>
            <div className="stat-value negative">{formatAmount(stats.expenses)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Доходы</div>
            <div className="stat-value positive">{formatAmount(stats.income)}</div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="filters">
        <select
          className="filter-select"
          value={filters.accountId}
          onChange={(e) => handleFilterChange('accountId', e.target.value)}
        >
          <option value="">Все счета</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.account_number} ({acc.bank_name})
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.cardId}
          onChange={(e) => handleFilterChange('cardId', e.target.value)}
        >
          <option value="">Все карты</option>
          {cards.map(card => (
            <option key={card.id} value={card.id}>
              {card.card_number} ({card.bank_name})
            </option>
          ))}
        </select>
        <input
          type="date"
          className="filter-select"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          placeholder="С даты"
        />
        <input
          type="date"
          className="filter-select"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          placeholder="По дату"
        />
      </div>

      {/* Список транзакций */}
      {transactions.length > 0 ? (
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
      ) : (
        <p className="empty-message">Нет транзакций</p>
      )}
    </div>
  );
}

export default Transactions;

