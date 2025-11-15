const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/database');

const router = express.Router();

// Регистрация
router.post('/register', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('username').isLength({ min: 3 }).withMessage('Логин должен быть минимум 3 символа'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Пароли не совпадают');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password } = req.body;
    const db = getDB();

    // Проверка существующего пользователя
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (row) {
        return res.status(400).json({ message: 'Пользователь с таким email или логином уже существует' });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создание пользователя
      db.run(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, username, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Ошибка создания пользователя' });
          }

          // Генерация JWT токена
          const token = jwt.sign(
            { id: this.lastID, email, username },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: '7d' }
          );

          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
          });

          res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: { id: this.lastID, email, username },
            token
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Вход
router.post('/login', [
  body('login').notEmpty().withMessage('Логин или email обязателен'),
  body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { login, password } = req.body;
    const db = getDB();

    // Поиск пользователя по email или username
    db.get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [login, login],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка базы данных' });
        }
        if (!user) {
          return res.status(401).json({ message: 'Неверный логин или пароль' });
        }

        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ message: 'Неверный логин или пароль' });
        }

        // Генерация JWT токена
        const token = jwt.sign(
          { id: user.id, email: user.email, username: user.username },
          process.env.JWT_SECRET || 'default-secret',
          { expiresIn: '7d' }
        );

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
          message: 'Успешный вход',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            subscription_active: user.subscription_active
          },
          token
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Выход
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Успешный выход' });
});

// Проверка текущего пользователя
const { authenticateToken } = require('../middleware/auth');
router.get('/me', authenticateToken, (req, res) => {
  const db = getDB();
  db.get(
    'SELECT id, email, username, avatar, subscription_active, theme, language FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      res.json({ user });
    }
  );
});

module.exports = router;

