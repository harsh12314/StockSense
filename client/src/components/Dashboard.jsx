import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/auth';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse cached user data', e);
    }

    // Verify token validity with backend
    const token = localStorage.getItem('token');
    if (!token) {
      onLogout();
      return;
    }

    fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          // Token is invalid or expired
          onLogout();
        } else if (data.data?.user) {
          setUser({
            id: data.data.user.id,
            loginId: data.data.user.login_id,
            email: data.data.user.email,
            role: data.data.user.role,
          });
        }
      })
      .catch((err) => {
        console.warn('Profile sync network error:', err);
      });
  }, [onLogout]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="success-icon">
          <span className="checkmark">✓</span>
        </div>

        <h1>Successful</h1>
        <p className="welcome-text">
          Welcome{user ? `, ${user.loginId}` : ''}! You are now authenticated.
        </p>
        {user && <p className="user-email">{user.email}</p>}
        {user && <p className="user-role">{user.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff'}</p>}

        <button className="btn-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
