// ══════════════════════════════════════════
// SmartTask Pro — Zustand Store
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
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_user');
    set({ user: null, token: null });
  },

  // Toast
  toast: null,
  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  // Departments
  departments: [],
  loadDepartments: async () => {
    const data = await api.getDepartments();
    set({ departments: data });
  },

  // Users
  users: [],
  loadUsers: async (params) => {
    const data = await api.getUsers(params);
    set({ users: data });
  },


  // Tasks
  tasks: [],
  myTasks: [],
  loadTasks: async (params) => {
    const data = await api.getTasks(params);
    set({ tasks: data });
  },
  loadMyTasks: async () => {
    const data = await api.getMyTasks();
    set({ myTasks: data });
  },

  // Flags
  flags: [],
  loadFlags: async (params) => {
    const data = await api.getFlags(params);
    set({ flags: data });
  },

  // Stats
  stats: null,
  heatmap: [],
  loadStats: async () => {
    const data = await api.getStats();
    set({ stats: data });
  },
  loadHeatmap: async () => {
    const data = await api.getHeatmap();
    set({ heatmap: data });
  },

  // Notifications
  notifications: [],
  loadNotifications: async () => {
    const data = await api.getNotifications();
    set({ notifications: data });
  },
}));

export default useStore;
