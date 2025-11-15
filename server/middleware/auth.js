const jwt = require('jsonwebtoken');
const { getDB } = require('../models/database');

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
}

// Middleware для проверки подписки
function requireSubscription(req, res, next) {
  const db = getDB();
  const userId = req.user.id;

  db.get(
    'SELECT subscription_active FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка проверки подписки' });
      }
      if (!row || !row.subscription_active) {
        return res.status(403).json({ 
          message: 'Эта функция доступна только для подписчиков' 
        });
      }
      next();
    }
  );
}

module.exports = {
  authenticateToken,
  requireSubscription
};

