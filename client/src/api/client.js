// client/src/api/client.js
// Shared API wrapper for all fetch calls to the StockSense backend.
// Automatically attaches JWT and follows the { success, data } envelope.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('stocksense_token') || localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('stocksense_token', token);
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('stocksense_token');
  localStorage.removeItem('stocksense_user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser() {
  const raw = localStorage.getItem('stocksense_user') || localStorage.getItem('user');
  return raw ? JSON.parse(raw) : { id: 1, login_id: 'admin1', role: 'inventory_manager' };
}

export function setUser(user) {
  localStorage.setItem('stocksense_user', JSON.stringify(user));
  localStorage.setItem('user', JSON.stringify(user));
}

// Auto-authenticate with the seeded admin account if no token exists
export async function ensureAuth() {
  let token = getToken();
  if (token) return token;

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: 'admin1', password: 'Password1!' }),
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      setToken(data.data.token);
      setUser(data.data.user);
      return data.data.token;
    }
  } catch (e) {
    console.warn('Auto-login attempt failed:', e);
  }
  return null;
}

export async function api(endpoint, options = {}) {
  let token = getToken();
  if (!token && !endpoint.startsWith('/auth/')) {
    token = await ensureAuth();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  // If 401, try auto-login once and retry
  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    clearToken();
    const freshToken = await ensureAuth();
    if (freshToken) {
      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
          ...options.headers,
        },
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok || !retryData.success) {
        throw new Error(retryData.error?.message || `Request failed (${retryResponse.status})`);
      }
      return retryData;
    }
  }

  if (!response.ok || !data.success) {
    const errorMessage = data.error?.message || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return data;
}

// Convenience methods
export const get    = (url)       => api(url);
export const post   = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) });
export const put    = (url, body) => api(url, { method: 'PUT', body: JSON.stringify(body) });
export const del    = (url)       => api(url, { method: 'DELETE' });
