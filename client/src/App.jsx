import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ReceiptsList from './features/receipts/ReceiptsList';
import ReceiptDetail from './features/receipts/ReceiptDetail';
import DeliveryList from './features/deliveries/DeliveryList';
import DeliveryDetail from './features/deliveries/DeliveryDetail';
import TransferDetail from './features/transfers/TransferDetail';
import './index.css';
import './App.css';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

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

          {/* Core Dashboard & Operations with Full Layout (Protected) */}
          <Route
            path="/dashboard"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="dashboard" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/products"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="products" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/receipts"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="receipts" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/deliveries"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="deliveries" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/transfers"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="transfers" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ledger"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="ledger" /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/warehouses"
            element={token ? <Dashboard onLogout={handleLogout} initialTab="warehouses" /> : <Navigate to="/login" replace />}
          />

          {/* Deep Detail Views (Protected) */}
          <Route
            path="/receipts/:id"
            element={token ? <ReceiptDetail /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/deliveries/:id"
            element={token ? <DeliveryDetail /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/transfers/:id"
            element={token ? <TransferDetail /> : <Navigate to="/login" replace />}
          />

          {/* Catch-all fallback */}
          <Route
            path="*"
            element={<Navigate to={token ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
