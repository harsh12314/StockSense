import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import SplineBackground from './SplineBackground';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/auth\/?$/, '') + '/auth';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanLoginId = loginId.trim();
    if (!cleanLoginId || !password) {
      setError('Please enter both Login ID and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: cleanLoginId, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Login failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      onLogin(data.data.token, data.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Unable to connect to the server. Make sure the backend is running on port 4000.');
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setLoginId('admin1');
    setPassword('Password1!');
    setError('');
  };

  return (
    <div className="auth-page">
      {/* 3D Spline background preserved in background without obstruction */}
      <SplineBackground scene="https://prod.spline.design/LHB9hInitRb0kDY1/scene.splinecode" showBranding={false} />

      <div className="auth-wrapper">
        {/* Left Hero Column */}
        <div className="auth-hero-section">
          <div className="auth-hero-badge">
            <span className="auth-badge-dot" />
            <span>INTELLIGENT LOGISTICS ERP</span>
          </div>

          <h1 className="auth-hero-title">
            STOCK<br />
            <span className="brand-highlight">SENSE</span>
          </h1>

          <div className="auth-hero-quote">
            <p>&ldquo;Know what you have, where it is, before it&apos;s a problem.&rdquo;</p>
          </div>

          {/* Logistics Graphic Banner */}
          <div className="auth-hero-card">
            <div className="auth-hero-card-pattern" />
            <div className="auth-hero-emojis">
              <span role="img" aria-label="Cargo Ship">🚢</span>
              <span role="img" aria-label="Logistics Crane">🏗️</span>
              <span role="img" aria-label="Inventory Box">📦</span>
              <span role="img" aria-label="Delivery Truck">🚚</span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="auth-card">
          {/* Segmented Tab Switcher */}
          <div className="auth-tab-switcher">
            <button
              type="button"
              className="auth-tab-btn active"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="auth-tab-btn"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-card-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="auth-error-box">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label htmlFor="login-id">Login ID</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  id="login-id"
                  type="text"
                  placeholder="Enter your Login ID"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-btn-spinner" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <button
              type="button"
              className="auth-btn-demo"
              onClick={handleFillDemo}
            >
              🔑 Fill Demo Admin Credentials
            </button>
          </form>

          <div className="auth-footer-link">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-demo-badge">
        <span>Demo — polished styling, live auth</span>
      </div>
    </div>
  );
}
