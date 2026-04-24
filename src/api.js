// ══════════════════════════════════════════
// SmartTask Pro — API Service with Cache
// ══════════════════════════════════════════
const BASE = import.meta.env.VITE_API_URL || '/api';

// Timeout réduit à 8s (le backend redémarre en 4-5s max)
const TIMEOUT_MS = 8000;

// ── Cache localStorage ───────────────────────────────────────────
// Les données GET sont mises en cache et retournées immédiatement
// pendant que la requête fraîche s'effectue en arrière-plan.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = {
  get(key) {
    try {
      const raw = localStorage.getItem(`st_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`st_cache_${key}`); return null; }
      return data;
    } catch { return null; }
  },
  set(key, data) {
    try {
      localStorage.setItem(`st_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
  },
  clear(pattern) {
    // Clear all cache entries matching a pattern (e.g. after a write)
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('st_cache_') && (!pattern || k.includes(pattern))) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  },
};

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('st_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ── Core request with timeout + retry ───────────────────────────
async function request(method, path, body = null, retries = 1) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  opts.signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, opts);
    clearTimeout(timeout);

    if (res.status === 401) {
      localStorage.removeItem('st_token');
      localStorage.removeItem('st_user');
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
  } catch (e) {
    clearTimeout(timeout);
    if (retries > 0 && (e.name === 'AbortError' || e.name === 'TypeError')) {
      console.warn(`[API] retry ${path} (${e.name})`);
      await new Promise(r => setTimeout(r, 1500));
      return request(method, path, body, retries - 1);
    }
    if (e.name === 'AbortError') throw new Error('Serveur non disponible, réessai automatique...');
    throw e;
  }
}

// ── Cached GET: returns cache immediately + refreshes in background ──
// callback(data, fromCache) is called:
//   1st call: immediately with cached data (fromCache=true) if available
//   2nd call: with fresh data when request completes (fromCache=false)
async function cachedGet(path, callback) {
  const key = path.replace(/[^a-zA-Z0-9_]/g, '_');
  const cached = cache.get(key);

  if (cached !== null) {
    // Return cached data immediately (no wait)
    callback(cached, true);
    // Refresh in background
    try {
      const fresh = await request('GET', path);
      if (fresh !== undefined) {
        cache.set(key, fresh);
        callback(fresh, false);
      }
    } catch (e) {
      console.warn(`[API cache] background refresh failed for ${path}:`, e.message);
      // Keep showing cached data — don't throw
    }
  } else {
    // No cache — fetch normally
    try {
      const data = await request('GET', path);
      if (data !== undefined) {
        cache.set(key, data);
        callback(data, false);
      }
    } catch (e) {
      throw e;
    }
  }
}

// ── Simple cached GET that returns a promise ─────────────────────
// Returns cached data first if available, updates store after
async function getWithCache(path) {
  const key = path.replace(/[^a-zA-Z0-9_]/g, '_');
  const cached = cache.get(key);

  if (cached !== null) {
    // Fire background refresh (don't await)
    request('GET', path).then(fresh => {
      if (fresh !== undefined) cache.set(key, fresh);
    }).catch(() => {});
    return cached; // Return immediately
  }

  const data = await request('GET', path);
  if (data !== undefined) cache.set(key, data);
  return data;
}

const api = {
  // Auth (never cached)
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  getMe: () => request('GET', '/auth/me'),

  // Departments (cached)
  getDepartments: () => getWithCache('/departments'),
  createDepartment: (data) => { cache.clear('departments'); return request('POST', '/departments', data); },
  updateDepartment: (id, data) => { cache.clear('departments'); return request('PUT', `/departments/${id}`, data); },
  deleteDepartment: (id) => { cache.clear('departments'); return request('DELETE', `/departments/${id}`); },

  // Users (cached)
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return getWithCache(`/users${qs ? '?' + qs : ''}`);
  },
  createUser: (data) => { cache.clear('users'); return request('POST', '/users', data); },
  updateUser: (id, data) => { cache.clear('users'); return request('PUT', `/users/${id}`, data); },
  deleteUser: (id) => { cache.clear('users'); return request('DELETE', `/users/${id}`); },

  // Tasks (cached)
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return getWithCache(`/tasks${qs ? '?' + qs : ''}`);
  },
  getMyTasks: () => getWithCache('/tasks/my'),
  createTask: (data) => { cache.clear('tasks'); return request('POST', '/tasks', data); },
  updateTask: (id, data) => { cache.clear('tasks'); return request('PUT', `/tasks/${id}`, data); },
  deleteTask: (id) => { cache.clear('tasks'); return request('DELETE', `/tasks/${id}`); },

  // Flags (cached)
  getFlags: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return getWithCache(`/flags${qs ? '?' + qs : ''}`);
  },
  createFlag: (data) => { cache.clear('flags'); return request('POST', '/flags', data); },
  updateFlag: (id, data) => { cache.clear('flags'); return request('PUT', `/flags/${id}`, data); },
  closeFlag: (id) => { cache.clear('flags'); return request('POST', `/flags/${id}/close`); },
  deleteFlag: (id) => { cache.clear('flags'); return request('DELETE', `/flags/${id}`); },

  // Dashboard (cached, short TTL handled by store)
  getStats: () => getWithCache('/dashboard/stats'),
  getHeatmap: () => getWithCache('/dashboard/heatmap'),

  // Knowledge
  searchKnowledge: (q) => request('GET', `/knowledge${q ? '?q=' + q : ''}`),

  // Notifications (cached briefly)
  getNotifications: () => getWithCache('/notifications'),
  markRead: (id) => { cache.clear('notifications'); return request('PUT', `/notifications/${id}/read`); },

  // Attachments (cached)
  uploadFile: async (file, flagId, taskId) => {
    cache.clear('attachments');
    const fd = new FormData();
    fd.append('file', file);
    if (flagId) fd.append('flag_id', String(flagId));
    if (taskId) fd.append('task_id', String(taskId));
    const token = localStorage.getItem('st_token');
    const res = await fetch(`${BASE}/attachments`, {
      method: 'POST', body: fd,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload error ${res.status}`);
    }
    return res.json();
  },
  getAttachments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return getWithCache(`/attachments${qs ? '?' + qs : ''}`);
  },
  deleteAttachment: (id) => { cache.clear('attachments'); return request('DELETE', `/attachments/${id}`); },

  // Utility: manually clear all cache (e.g. after logout)
  clearCache: () => cache.clear(),
};

export default api;
