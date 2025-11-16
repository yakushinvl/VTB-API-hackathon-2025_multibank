const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { makeBankRequest } = require('../services/bankService');

const router = express.Router();

// Получить предложения от банков
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { search, bank } = req.query;

    // Получить все подключения пользователя
    db.all(
      'SELECT * FROM bank_connections WHERE user_id = ?',
      [userId],
      async (err, connections) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения подключений' });
        }

        const allOffers = [];
        const errors = [];

        // Получить предложения от каждого банка
        for (const connection of connections) {
          if (bank && connection.bank_name.toLowerCase() !== bank.toLowerCase()) {
            continue;
          }

          try {
            const offers = await makeBankRequest(
              userId,
              connection.id,
              '/products'
            );

            const offersList = Array.isArray(offers) ? offers : (offers.offers || []);
            
            offersList.forEach(offer => {
              allOffers.push({
                ...offer,
                bank_name: connection.bank_name,
                bank_domain: connection.bank_domain
              });
            });
          } catch (error) {
            errors.push({
              bank: connection.bank_name,
              error: error.message
            });
          }
        }

        // Фильтрация по поисковому запросу
        let filteredOffers = allOffers;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredOffers = allOffers.filter(offer => 
            offer.title?.toLowerCase().includes(searchLower) ||
            offer.description?.toLowerCase().includes(searchLower) ||
            offer.category?.toLowerCase().includes(searchLower)
          );
        }

        res.json({
          offers: filteredOffers,
          total: filteredOffers.length,
          errors: errors.length > 0 ? errors : undefined
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения предложений', error: error.message });
  }
});

module.exports = router;

