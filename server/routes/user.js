const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../models/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Получить профиль пользователя
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  db.get(
    'SELECT id, email, username, avatar, subscription_active, theme, language, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка получения профиля' });
      }
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Получить подключенные банки
      db.all(
        'SELECT id, bank_name, bank_domain, connected_at FROM bank_connections WHERE user_id = ?',
        [userId],
        (err, banks) => {
          if (err) {
            return res.status(500).json({ message: 'Ошибка получения банков' });
          }

          res.json({
            user: {
              ...user,
              connectedBanks: banks || []
            }
          });
        }
      );
    }
  );
});

// Активировать подписку
router.post('/subscribe', authenticateToken, (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  db.run(
    'UPDATE users SET subscription_active = 1 WHERE id = ?',
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Ошибка активации подписки' });
      }

      res.json({ 
        message: 'Подписка успешно активирована',
        subscription_active: true
      });
    }
  );
});

// Обновить профиль
router.put('/profile', authenticateToken, [
  body('username').optional().isLength({ min: 3 }).withMessage('Логин должен быть минимум 3 символа'),
  body('email').optional().isEmail().withMessage('Некорректный email'),
  body('theme').optional().isIn(['light', 'dark']).withMessage('Тема должна быть light или dark'),
  body('language').optional().isIn(['ru', 'en']).withMessage('Язык должен быть ru или en')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const db = getDB();
  const userId = req.user.id;
  const { username, email, avatar, theme, language } = req.body;

  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  if (avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(avatar);
  }
  if (theme) {
    updates.push('theme = ?');
    params.push(theme);
  }
  if (language) {
    updates.push('language = ?');
    params.push(language);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Нет данных для обновления' });
  }

  params.push(userId);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Ошибка обновления профиля' });
      }

      db.get(
        'SELECT id, email, username, avatar, subscription_active, theme, language FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            return res.status(500).json({ message: 'Ошибка получения обновленного профиля' });
          }
          res.json({ message: 'Профиль успешно обновлен', user });
        }
      );
    }
  );
});

// Изменить пароль
router.put('/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Текущий пароль обязателен'),
  body('newPassword').isLength({ min: 6 }).withMessage('Новый пароль должен быть минимум 6 символов'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Пароли не совпадают');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const db = getDB();
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  db.get(
    'SELECT password FROM users WHERE id = ?',
    [userId],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Проверка текущего пароля
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Неверный текущий пароль' });
      }

      // Хеширование нового пароля
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ message: 'Ошибка обновления пароля' });
          }
          res.json({ message: 'Пароль успешно изменен' });
        }
      );
    }
  );
});

module.exports = router;
