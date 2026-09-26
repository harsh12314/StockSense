import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ReceiptsList from './features/receipts/ReceiptsList';
import ReceiptDetail from './features/receipts/ReceiptDetail';
import DeliveryList from './features/deliveries/DeliveryList';
import DeliveryDetail from './features/deliveries/DeliveryDetail';
import './index.css';
import './App.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (newToken, user) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Landing / Default */}
          <Route
            path="/"
            element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />

          {/* Auth */}
          <Route
            path="/login"
            element={token ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/signup"
            element={token ? <Navigate to="/dashboard" replace /> : <Signup onLogin={handleLogin} />}
          />

          {/* Core Dashboard & Products */}
          <Route
            path="/dashboard"
            element={token ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/products"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="products" /> : <Navigate to="/login" replace />}
          />

          {/* Receipts Feature */}
          <Route
            path="/receipts"
            element={<ReceiptsList />}
          />
          <Route
            path="/receipts/:id"
            element={<ReceiptDetail />}
          />

          {/* Deliveries Feature */}
          <Route
            path="/deliveries"
            element={<DeliveryList />}
          />
          <Route
            path="/deliveries/:id"
            element={<DeliveryDetail />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
