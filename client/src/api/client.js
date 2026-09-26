// client/src/api/client.js
// Universal API client supporting both direct methods (get, post, put, patch, del) and api object

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/auth\/?$/, '')
  : 'http://localhost:4000/api';

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

// Universal helper: callable function AND object with method verbs
export async function api(endpoint, options = {}) {
  return request(endpoint, options);
}

api.get = async (path, params) => {
  const res = await get(path, params);
  return res && res.data !== undefined ? res.data : res;
};

api.post = async (path, body) => {
  const res = await post(path, body);
  return res && res.data !== undefined ? res.data : res;
};

api.put = async (path, body) => {
  const res = await put(path, body);
  return res && res.data !== undefined ? res.data : res;
};

api.patch = async (path, body) => {
  const res = await patch(path, body);
  return res && res.data !== undefined ? res.data : res;
};

api.delete = async (path) => {
  const res = await del(path);
  return res && res.data !== undefined ? res.data : res;
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

