// client/src/api/client.js
// Universal API client supporting both direct methods (get, post, put, del) and api object

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/auth\/?$/, '')
  : 'http://localhost:3001/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || (json && json.success === false)) {
    const errorMsg = json?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = json;
    throw err;
  }

  return json;
}

export async function get(endpoint, params) {
  let url = endpoint;
  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return request(url, { method: 'GET' });
}

export async function post(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body,
  });
}

export async function put(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body,
  });
}

export async function patch(endpoint, body) {
  return request(endpoint, {
    method: 'PATCH',
    body,
  });
}

export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

// Compact helper object returning json.data directly for modular feature APIs
export const api = {
  get: async (path) => {
    const res = await request(path, { method: 'GET' });
    return res && res.data !== undefined ? res.data : res;
  },
  post: async (path, body) => {
    const res = await request(path, { method: 'POST', body });
    return res && res.data !== undefined ? res.data : res;
  },
  put: async (path, body) => {
    const res = await request(path, { method: 'PUT', body });
    return res && res.data !== undefined ? res.data : res;
  },
  delete: async (path) => {
    const res = await request(path, { method: 'DELETE' });
    return res && res.data !== undefined ? res.data : res;
  },
};

export default {
  get,
  post,
  put,
  patch,
  del,
  api,
  getToken,
  getUser,
};
