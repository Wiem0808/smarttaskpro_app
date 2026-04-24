// ══════════════════════════════════════════
// SmartTask Pro — Zustand Store (with cache-aware loading)
// ══════════════════════════════════════════
import { create } from 'zustand';
import api from './api';

const useStore = create((set, get) => ({
  // Auth
  user: JSON.parse(localStorage.getItem('st_user') || 'null'),
  token: localStorage.getItem('st_token') || null,

  login: async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('st_token', res.access_token);
    localStorage.setItem('st_user', JSON.stringify(res.user));
    set({ user: res.user, token: res.access_token });
    return res.user;
  },

  logout: () => {
    api.clearCache();
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_user');
    set({ user: null, token: null });
  },

  // Toast
  toast: null,
  _toastTimer: null,
  showToast: (msg, type = 'success') => {
    const prev = get()._toastTimer;
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => set({ toast: null, _toastTimer: null }), 3500);
    set({ toast: { msg, type }, _toastTimer: timer });
  },

  // Global backend connectivity
  backendOnline: true,
  setBackendOnline: (v) => set({ backendOnline: v }),

  // Departments
  departments: [],
  loadDepartments: async () => {
    try {
      const data = await api.getDepartments();
      if (data) set({ departments: data });
      get().setBackendOnline(true);
    } catch (e) {
      console.error('loadDepartments:', e.message);
      get().setBackendOnline(false);
    }
  },

  // Users
  users: [],
  loadUsers: async (params) => {
    try {
      const data = await api.getUsers(params);
      if (data) set({ users: data });
      get().setBackendOnline(true);
    } catch (e) {
      console.error('loadUsers:', e.message);
      get().setBackendOnline(false);
    }
  },

  // Tasks
  tasks: [],
  myTasks: [],
  loadTasks: async (params) => {
    try {
      const data = await api.getTasks(params);
      if (data) set({ tasks: data });
      get().setBackendOnline(true);
    } catch (e) {
      console.error('loadTasks:', e.message);
      get().setBackendOnline(false);
    }
  },
  loadMyTasks: async () => {
    try {
      const data = await api.getMyTasks();
      if (data) set({ myTasks: data });
    } catch (e) {
      console.error('loadMyTasks:', e.message);
    }
  },

  // Flags
  flags: [],
  loadFlags: async (params) => {
    try {
      const data = await api.getFlags(params);
      if (data) set({ flags: data });
      get().setBackendOnline(true);
    } catch (e) {
      console.error('loadFlags:', e.message);
      get().setBackendOnline(false);
    }
  },

  // Stats
  stats: null,
  heatmap: [],
  loadStats: async () => {
    try {
      const data = await api.getStats();
      if (data) set({ stats: data });
    } catch (e) {
      console.error('loadStats:', e.message);
    }
  },
  loadHeatmap: async () => {
    try {
      const data = await api.getHeatmap();
      if (data) set({ heatmap: data || [] });
    } catch (e) {
      console.error('loadHeatmap:', e.message);
    }
  },

  // Notifications
  notifications: [],
  loadNotifications: async () => {
    try {
      const data = await api.getNotifications();
      if (data) set({ notifications: data || [] });
    } catch (e) {
      console.error('loadNotifications:', e.message);
    }
  },
}));

export default useStore;
