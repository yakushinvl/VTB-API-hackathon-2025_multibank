import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Offers.css';

function Offers() {
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, [search]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const response = await api.get('/offers', { params });
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Ошибка загрузки предложений:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1>Предложения</h1>

      {/* Поиск */}
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по предложениям..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Список предложений */}
      {offers.length > 0 ? (
        <div className="offers-grid">
          {offers.map((offer, index) => (
            <div key={index} className="offer-card">
              <div className="offer-header">
                <h3 className="offer-title">{offer.title || 'Предложение'}</h3>
                {offer.bank_name && (
                  <span className="offer-bank">{offer.bank_name}</span>
                )}
              </div>
              <p className="offer-description">
                {offer.description || 'Описание отсутствует'}
              </p>
              {offer.category && (
                <div className="offer-category">
                  Категория: {offer.category}
                </div>
              )}
              {offer.rate && (
                <div className="offer-rate">
                  Ставка: {offer.rate}%
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-message">
          {search ? 'Предложения не найдены' : 'Нет доступных предложений'}
        </p>
      )}
    </div>
  );
}

export default Offers;

