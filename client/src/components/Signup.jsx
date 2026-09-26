import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Package, BarChart3 } from 'lucide-react';
import SplineBackground from './SplineBackground';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/auth\/?$/, '') + '/auth';

export default function Signup({ onLogin }) {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('warehouse_staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanLoginId = loginId.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Client-side validation
    if (cleanLoginId.length < 6 || cleanLoginId.length > 12) {
      setError('Login ID must be between 6 and 12 characters.');
      return;
    }

    if (password.length <= 8) {
      setError('Password must be longer than 8 characters.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('Password must contain at least one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: cleanLoginId,
          email: cleanEmail,
          password,
          confirmPassword,
          role,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Signup failed. Please try again.');
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
              className="auth-tab-btn"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="auth-tab-btn active"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-card-header">
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Join StockSense — it only takes a minute</p>
          </div>

          {error && (
            <div className="auth-error-box">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label htmlFor="signup-loginid">Login ID</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  id="signup-loginid"
                  type="text"
                  placeholder="6–12 alphanumeric characters"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  required
                  minLength={6}
                  maxLength={12}
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-email">Work Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 9 chars, upper, lower, symbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div className="auth-field-group">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="signup-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Select Workspace Role</label>
              <div className="auth-role-grid">
                <button
                  type="button"
                  className={`auth-role-card ${role === 'warehouse_staff' ? 'active' : ''}`}
                  onClick={() => setRole('warehouse_staff')}
                >
                  <div className="auth-role-card-top">
                    <Package size={16} className="auth-role-icon text-blue" />
                    <span className="auth-role-title">Warehouse Staff</span>
                  </div>
                  <span className="auth-role-desc">Picking, packing &amp; transfers</span>
                </button>

                <button
                  type="button"
                  className={`auth-role-card ${role === 'inventory_manager' ? 'active' : ''}`}
                  onClick={() => setRole('inventory_manager')}
                >
                  <div className="auth-role-card-top">
                    <BarChart3 size={16} className="auth-role-icon text-indigo" />
                    <span className="auth-role-title">Inventory Manager</span>
                  </div>
                  <span className="auth-role-desc">Full ops &amp; ledger control</span>
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-btn-spinner" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="auth-footer-link">
            <p>
              Already have an account?{' '}
              <Link to="/login">Sign In</Link>
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
