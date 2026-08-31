const getToken = () => localStorage.getItem('auth_token');

const BASE_URL = process.env.REACT_APP_API_URL || '';

export async function api(url, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...opts.headers,
  };
  const res = await fetch(`${BASE_URL}${url}`, { ...opts, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function apiUpload(url, formData, opts = {}) {
  const token = getToken();
  const headers = { ...(token ? { Authorization: `Token ${token}` } : {}), ...opts.headers };
  const res = await fetch(`${BASE_URL}${url}`, { method: 'POST', headers, body: formData, ...opts });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.json();
}

export default api;
