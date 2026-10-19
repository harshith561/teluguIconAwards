const PROD_API_URL = 'https://teluguiconawards.in/api';

const rawEnv = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE = rawEnv
  ? (rawEnv.replace(/\/+$/, '').endsWith('/api') ? rawEnv.replace(/\/+$/, '') : `${rawEnv.replace(/\/+$/, '')}/api`)
  : (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes('vercel.app')
      ? '/api'
      : (import.meta.env.DEV ? '/api' : PROD_API_URL));

export const getImageUrl = (id) => {
  if (!id) return '';
  if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://') || id.startsWith('/'))) {
    return getAssetUrl(id);
  }
  return `${API_BASE}/images/${id}/file`;
};

export const getAssetUrl = (url) => {
  if (!url) return '';
  if (typeof url === 'number' || /^\d+$/.test(String(url).trim())) {
    return `${API_BASE}/images/${String(url).trim()}/file`;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  // If already pointing to API route (e.g. /api/images/1/file)
  if (cleanPath.startsWith('/api/')) {
    if (API_BASE === '/api' || (typeof window !== 'undefined' && window.location.port === '5173')) {
      return cleanPath;
    }
    const origin = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    return origin ? `${origin}${cleanPath}` : cleanPath;
  }

  const origin = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  if (origin && origin !== '/api') {
    return `${origin}${cleanPath}`;
  }
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return cleanPath;
  }
  return `https://teluguiconawards.in${cleanPath}`;
};


// In-memory response cache for lightning-fast tab navigation
const memoryCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds fresh cache

export const clearApiCache = (pattern) => {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) memoryCache.delete(key);
  }
};

async function withStatus(res) {
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(data)) {
    data.httpStatus = res.status;
    data.ok = res.ok;
    return data;
  }
  data.httpStatus = res.status;
  data.ok = res.ok;
  return data;
}

export const api = {
  get: async (url, options = {}) => {
    const cacheKey = `${API_BASE}${url}`;
    const now = Date.now();

    // Check fast cache unless bypassed
    if (!options.force && memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const token = localStorage.getItem('admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${url}`, { headers });
    if (res.status === 401 && (url.includes('/admin') || url.includes('/auth/me'))) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    const data = await withStatus(res);
    if (res.ok) {
      memoryCache.set(cacheKey, { timestamp: now, data });
    }
    return data;
  },

  post: async (url, data) => {
    clearApiCache();
    const token = localStorage.getItem('admin_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return withStatus(res);
  },

  put: async (url, data) => {
    clearApiCache();
    const token = localStorage.getItem('admin_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return withStatus(res);
  },

  delete: async (url) => {
    clearApiCache();
    const token = localStorage.getItem('admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers,
    });
    return withStatus(res);
  },

  postMultipart: async (url, formData) => {
    clearApiCache();
    const token = localStorage.getItem('admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return withStatus(res);
  },

  putMultipart: async (url, formData) => {
    clearApiCache();
    const token = localStorage.getItem('admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    return withStatus(res);
  },

  upload: async (file, options = {}) => {
    clearApiCache();
    const formData = new FormData();
    formData.append('image', file);
    if (options.section) formData.append('section', options.section);
    if (options.entity_type) formData.append('entity_type', options.entity_type);
    if (options.entity_id) formData.append('entity_id', options.entity_id);

    const token = localStorage.getItem('admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return withStatus(res);
  },
};