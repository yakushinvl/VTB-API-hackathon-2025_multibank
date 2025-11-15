import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getAvatarContent = () => {
    if (user?.avatar) {
      return <img src={user.avatar} alt="Avatar" />;
    }
    return '👤';
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          Мультибанк
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/transactions" className="nav-link">Транзакции</Link>
          <Link to="/offers" className="nav-link">Предложения</Link>
          {user?.subscription_active && (
            <Link to="/assistant" className="nav-link">Помощник</Link>
          )}
        </nav>
      </div>
      <div className="header-right">
        <Link to="/profile" className="avatar">
          {getAvatarContent()}
        </Link>
        <button onClick={handleLogout} className="btn btn-secondary">
          Выход
        </button>
      </div>
    </header>
  );
}

export default Header;

