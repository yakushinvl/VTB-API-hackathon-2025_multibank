import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Offers from './pages/Offers';
import Assistant from './pages/Assistant';
import Profile from './pages/Profile';
import AccountDetail from './pages/AccountDetail';
import CardDetail from './pages/CardDetail';
import OAuthCallback from './pages/OAuthCallback';
import Header from './components/Header';
import NotificationContainer from './components/NotificationContainer';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const { notifications, removeNotification } = useNotifications();
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    if (user) {
      const newTheme = user.theme || 'light';
      const newLanguage = user.language || 'ru';
      
      setTheme(newTheme);
      document.body.className = newTheme === 'dark' ? 'dark' : '';
      
      setLanguage(newLanguage);
      document.documentElement.lang = newLanguage;
    } else {
      // Если пользователь не авторизован, сбросить тему
      setTheme('light');
      document.body.className = '';
      setLanguage('ru');
      document.documentElement.lang = 'ru';
    }
  }, [user?.theme, user?.language, user?.id]); // Зависимости от полей пользователя

  return (
    <div className={`app ${theme}`}>
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      {user && <Header />}
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/" replace /> : <Login />
          } 
        />
        <Route 
          path="/register" 
          element={
            user ? <Navigate to="/" replace /> : <Register />
          } 
        />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <PrivateRoute>
              <Transactions />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/offers" 
          element={
            <PrivateRoute>
              <Offers />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/assistant" 
          element={
            <PrivateRoute>
              <Assistant />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/accounts/:id" 
          element={
            <PrivateRoute>
              <AccountDetail />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/cards/:id" 
          element={
            <PrivateRoute>
              <CardDetail />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/oauth/callback" 
          element={
            <PrivateRoute>
              <OAuthCallback />
            </PrivateRoute>
          } 
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppRoutes />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

