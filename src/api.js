// ══════════════════════════════════════════
// SmartTask Pro — API Service
// ══════════════════════════════════════════
// In production (Vercel), set VITE_API_URL to your backend URL
// e.g. https://your-backend.railway.app/api
const BASE = import.meta.env.VITE_API_URL || '/api';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('st_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(method, path, body = null) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
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
}

const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  getMe: () => request('GET', '/auth/me'),

  // Departments
  getDepartments: () => request('GET', '/departments'),
  createDepartment: (data) => request('POST', '/departments', data),
  updateDepartment: (id, data) => request('PUT', `/departments/${id}`, data),
  deleteDepartment: (id) => request('DELETE', `/departments/${id}`),

  // Users
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/users${qs ? '?' + qs : ''}`);
  },
  createUser: (data) => request('POST', '/users', data),
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/users/${id}`),


  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/tasks${qs ? '?' + qs : ''}`);
  },
  getMyTasks: () => request('GET', '/tasks/my'),
  createTask: (data) => request('POST', '/tasks', data),
  updateTask: (id, data) => request('PUT', `/tasks/${id}`, data),
  deleteTask: (id) => request('DELETE', `/tasks/${id}`),

  // Flags
  getFlags: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/flags${qs ? '?' + qs : ''}`);
  },
  createFlag: (data) => request('POST', '/flags', data),
  updateFlag: (id, data) => request('PUT', `/flags/${id}`, data),
  closeFlag: (id) => request('POST', `/flags/${id}/close`),
  deleteFlag: (id) => request('DELETE', `/flags/${id}`),

  // Dashboard
  getStats: () => request('GET', '/dashboard/stats'),
  getHeatmap: () => request('GET', '/dashboard/heatmap'),

  // Knowledge
  searchKnowledge: (q) => request('GET', `/knowledge${q ? '?q=' + q : ''}`),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  markRead: (id) => request('PUT', `/notifications/${id}/read`),

  // Upload
  uploadFile: async (file, flagId, taskId) => {
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
    return request('GET', `/attachments${qs ? '?' + qs : ''}`);
  },
  deleteAttachment: (id) => request('DELETE', `/attachments/${id}`),
};

export default api;
