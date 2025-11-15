import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Offers from './pages/Offers';
import Assistant from './pages/Assistant';
import Profile from './pages/Profile';
import AccountDetail from './pages/AccountDetail';
import CardDetail from './pages/CardDetail';
import Header from './components/Header';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
      document.body.className = user.theme === 'dark' ? 'dark' : '';
    }
  }, [user]);

  return (
    <div className={`app ${theme}`}>
      {user && <Header />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
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
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

