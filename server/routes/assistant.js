const express = require('express');
const { authenticateToken, requireSubscription } = require('../middleware/auth');
const { getDB } = require('../models/database');

const router = express.Router();

// Все маршруты требуют подписку
router.use(authenticateToken);
router.use(requireSubscription);

// Получить анализ трат
router.get('/analysis', (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const { period = 'month' } = req.query;

  // Определить период
  let startDate;
  const endDate = new Date().toISOString();

  switch (period) {
    case 'week':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'month':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Получить транзакции за период
  db.all(
    `SELECT * FROM transactions 
     WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?
     ORDER BY transaction_date DESC`,
    [userId, startDate, endDate],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения транзакций' });
      }

      // Анализ трат по категориям
      const categoryStats = {};
      let totalExpenses = 0;
      let totalIncome = 0;

      transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        const category = transaction.category || 'Другое';

        if (amount < 0) {
          totalExpenses += Math.abs(amount);
          if (!categoryStats[category]) {
            categoryStats[category] = { expenses: 0, count: 0 };
          }
          categoryStats[category].expenses += Math.abs(amount);
          categoryStats[category].count += 1;
        } else {
          totalIncome += amount;
        }
      });

      // Генерация рекомендаций
      const recommendations = generateRecommendations(categoryStats, totalExpenses, totalIncome);

      res.json({
        period,
        startDate,
        endDate,
        statistics: {
          totalExpenses,
          totalIncome,
          balance: totalIncome - totalExpenses,
          categoryStats: Object.entries(categoryStats).map(([category, stats]) => ({
            category,
            ...stats,
            percentage: ((stats.expenses / totalExpenses) * 100).toFixed(2)
          }))
        },
        recommendations
      });
    }
  );
});

// Получить рекомендации по кэшбэку
router.get('/cashback', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;

    // Получить все карты пользователя
    db.all(
      'SELECT * FROM cards WHERE user_id = ?',
      [userId],
      async (err, cards) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка получения карт' });
        }

        // Получить транзакции за последний месяц
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        db.all(
          `SELECT * FROM transactions 
           WHERE user_id = ? AND transaction_date >= ? AND amount < 0
           ORDER BY transaction_date DESC`,
          [userId, startDate],
          (err, transactions) => {
            if (err) {
              return res.status(500).json({ message: 'Ошибка получения транзакций' });
            }

            // Анализ категорий трат
            const categorySpending = {};
            transactions.forEach(transaction => {
              const category = transaction.category || 'Другое';
              const amount = Math.abs(parseFloat(transaction.amount));
              categorySpending[category] = (categorySpending[category] || 0) + amount;
            });

            // Генерация рекомендаций по кэшбэку
            const cashbackRecommendations = generateCashbackRecommendations(categorySpending, cards);

            res.json({
              recommendations: cashbackRecommendations,
              categorySpending
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения рекомендаций', error: error.message });
  }
});

// Отправить вопрос помощнику
router.post('/chat', (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Вопрос обязателен' });
  }

  // Простая имитация ИИ-ответа (в реальном приложении здесь был бы вызов LLM API)
  const response = generateAIResponse(question);

  res.json({
    question,
    answer: response
  });
});

// Вспомогательные функции

function generateRecommendations(categoryStats, totalExpenses, totalIncome) {
  const recommendations = [];
  
  // Найти категорию с наибольшими тратами
  const topCategory = Object.entries(categoryStats)
    .sort((a, b) => b[1].expenses - a[1].expenses)[0];

  if (topCategory) {
    recommendations.push({
      type: 'spending',
      title: 'Больше всего трат',
      message: `Вы тратите больше всего в категории "${topCategory[0]}" (${topCategory[1].expenses.toFixed(2)} руб.). Рассмотрите возможность оптимизации расходов в этой категории.`
    });
  }

  // Проверка баланса
  const balance = totalIncome - totalExpenses;
  if (balance < 0) {
    recommendations.push({
      type: 'warning',
      title: 'Отрицательный баланс',
      message: 'Ваши расходы превышают доходы. Рекомендуется пересмотреть бюджет и сократить расходы.'
    });
  } else if (balance < totalIncome * 0.1) {
    recommendations.push({
      type: 'info',
      title: 'Низкие накопления',
      message: 'Рекомендуется откладывать минимум 10% от дохода. Рассмотрите возможность увеличения накоплений.'
    });
  }

  return recommendations;
}

function generateCashbackRecommendations(categorySpending, cards) {
  const recommendations = [];

  // Примерные ставки кэшбэка (в реальном приложении получать из API банков)
  const cashbackRates = {
    'Продукты': { vbank: 5, abank: 3, sbank: 4 },
    'Транспорт': { vbank: 3, abank: 5, sbank: 2 },
    'Рестораны': { vbank: 4, abank: 4, sbank: 5 },
    'Другое': { vbank: 1, abank: 1, sbank: 1 }
  };

  Object.entries(categorySpending).forEach(([category, amount]) => {
    const rates = cashbackRates[category] || cashbackRates['Другое'];
    const bestBank = Object.entries(rates)
      .sort((a, b) => b[1] - a[1])[0];

    recommendations.push({
      category,
      monthlySpending: amount,
      recommendation: `Используйте карту ${bestBank[0]} для категории "${category}"`,
      cashbackRate: `${bestBank[1]}%`,
      potentialCashback: (amount * bestBank[1] / 100).toFixed(2)
    });
  });

  return recommendations;
}

function generateAIResponse(question) {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('бюджет') || lowerQuestion.includes('трат')) {
    return 'Рекомендую вести учет всех расходов и планировать бюджет на месяц. Откладывайте минимум 10% от дохода.';
  }
  
  if (lowerQuestion.includes('кэшбэк') || lowerQuestion.includes('cashback')) {
    return 'Для максимального кэшбэка используйте разные карты для разных категорий трат. Проверьте раздел "Рекомендации по кэшбэку" для детальной информации.';
  }
  
  if (lowerQuestion.includes('накоп') || lowerQuestion.includes('сбереж')) {
    return 'Для накоплений рекомендую открыть накопительный счет или вклад. Рассмотрите предложения банков в разделе "Предложения".';
  }
  
  return 'Я могу помочь вам с анализом трат, рекомендациями по кэшбэку и финансовым планированием. Задайте более конкретный вопрос, и я дам детальный ответ.';
}

module.exports = router;

