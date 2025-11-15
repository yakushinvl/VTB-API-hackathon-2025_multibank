import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Home.css';

function Home() {
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeTab, setActiveTab] = useState('debit');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const getBankIcon = (bankName) => {
    const icons = {
      vbank: '🏦',
      abank: '🏛️',
      sbank: '🏪'
    };
    return icons[bankName?.toLowerCase()] || '🏦';
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(balance);
  };

  const formatCardNumber = (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === 'debit') return acc.account_type === 'debit';
    if (activeTab === 'credit') return acc.account_type === 'credit';
    if (activeTab === 'savings') return acc.account_type === 'savings' || acc.account_type === 'deposit';
    return true;
  });

  const filteredCards = cards.filter(card => {
    if (activeTab === 'debit') return card.card_type === 'debit';
    if (activeTab === 'credit') return card.card_type === 'credit';
    return true;
  });

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1>Главная</h1>

      {/* Мои счета */}
      <section className="section">
        <h2 className="section-title">Мои счета</h2>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'debit' ? 'active' : ''}`}
            onClick={() => setActiveTab('debit')}
          >
            Дебетовые
          </button>
          <button
            className={`tab ${activeTab === 'credit' ? 'active' : ''}`}
            onClick={() => setActiveTab('credit')}
          >
            Кредитные
          </button>
          <button
            className={`tab ${activeTab === 'savings' ? 'active' : ''}`}
            onClick={() => setActiveTab('savings')}
          >
            Накопительные
          </button>
        </div>
        {filteredAccounts.length > 0 ? (
          <div className="items-grid">
            {filteredAccounts.map((account) => (
              <Link
                key={account.id}
                to={`/accounts/${account.id}`}
                className="item-card"
              >
                <div className="item-header">
                  <span className="bank-icon">{getBankIcon(account.bank_name)}</span>
                  <div>
                    <div className="item-number">{account.account_number}</div>
                    <div className="item-balance">{formatBalance(account.balance)}</div>
                  </div>
                </div>
                <div className="item-meta">
                  {account.bank_name} • {account.account_type}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-message">Нет счетов этого типа</p>
        )}
      </section>

      {/* Мои карты */}
      <section className="section">
        <h2 className="section-title">Мои карты</h2>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'debit' ? 'active' : ''}`}
            onClick={() => setActiveTab('debit')}
          >
            Дебетовые
          </button>
          <button
            className={`tab ${activeTab === 'credit' ? 'active' : ''}`}
            onClick={() => setActiveTab('credit')}
          >
            Кредитные
          </button>
        </div>
        {filteredCards.length > 0 ? (
          <div className="items-grid">
            {filteredCards.map((card) => (
              <Link
                key={card.id}
                to={`/cards/${card.id}`}
                className="item-card"
              >
                <div className="item-header">
                  <span className="bank-icon">💳</span>
                  <div>
                    <div className="item-number">{formatCardNumber(card.card_number)}</div>
                    <div className="item-meta">{card.bank_name}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-message">Нет карт этого типа</p>
        )}
      </section>
    </div>
  );
}

export default Home;

