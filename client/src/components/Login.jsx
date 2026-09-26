import { useState } from 'react';
import { Link } from 'react-router-dom';
import SplineBackground from './SplineBackground';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/auth\/?$/, '') + '/auth';

function Login({ onLogin }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
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
        setError(data.error?.message || 'Login failed. Please try again.');
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
      <SplineBackground scene="https://prod.spline.design/LHB9hInitRb0kDY1/scene.splinecode" />
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to your account to continue</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-id">Login ID</label>
            <input
              id="login-id"
              type="text"
              placeholder="Enter your Login ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="spinner"></span>Signing in...</> : 'Sign In'}
          </button>

          <button
            type="button"
            className="btn-action-secondary"
            style={{ width: '100%', marginTop: '10px', padding: '9px', justifyContent: 'center' }}
            onClick={() => {
              setLoginId('admin1');
              setPassword('Password1!');
            }}
          >
            🔑 Fill Demo Admin Credentials
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            Don't have an account?{' '}
            <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
