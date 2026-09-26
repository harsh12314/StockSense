import { useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/auth` 
  : 'http://localhost:4000/api/auth';

function Signup({ onLogin }) {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    } catch (err) {
      setError('Unable to connect to the server. Make sure the backend is running on port 4000.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="subtitle">Join StockSense — it only takes a minute</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="signup-loginid">Login ID</label>
            <input
              id="signup-loginid"
              type="text"
              placeholder="6–12 characters"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={6}
              maxLength={12}
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="Min. 9 chars, upper, lower, special"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm">Re-enter Password</label>
            <input
              id="signup-confirm"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Select Role</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-card ${role === 'warehouse_staff' ? 'active' : ''}`}
                onClick={() => setRole('warehouse_staff')}
              >
                <div className="role-header">
                  <span className="role-icon">📦</span>
                  <span className="role-title">Warehouse Staff</span>
                </div>
                <span className="role-desc">Operations & scanning</span>
              </button>

              <button
                type="button"
                className={`role-card ${role === 'inventory_manager' ? 'active' : ''}`}
                onClick={() => setRole('inventory_manager')}
              >
                <div className="role-header">
                  <span className="role-icon">📊</span>
                  <span className="role-title">Inventory Manager</span>
                </div>
                <span className="role-desc">Full stock & operations control</span>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="spinner"></span>Creating account...</> : 'Sign Up'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
