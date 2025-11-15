import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.email,
        formData.username,
        formData.password,
        formData.confirmPassword
      );
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.errors?.[0]?.msg || 
                          err.response?.data?.message || 
                          'Ошибка регистрации';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">Регистрация</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Логин</label>
          <input
            type="text"
            name="username"
            className="form-input"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Пароль</label>
          <input
            type="password"
            name="password"
            className="form-input"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Подтверждение пароля</label>
          <input
            type="password"
            name="confirmPassword"
            className="form-input"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        <div className="form-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;

