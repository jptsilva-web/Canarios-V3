import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Zones API
export const zonesApi = {
  getAll: () => api.get('/zones'),
  getById: (id) => api.get(`/zones/${id}`),
  create: (data) => api.post('/zones', data),
  delete: (id) => api.delete(`/zones/${id}`),
  generateCages: (id) => api.post(`/zones/${id}/generate-cages`),
};

// Cages API
export const cagesApi = {
  getAll: (zoneId) => api.get('/cages', { params: { zone_id: zoneId } }),
  getById: (id) => api.get(`/cages/${id}`),
};

// Birds API
export const birdsApi = {
  getAll: (gender) => api.get('/birds', { params: { gender } }),
  getById: (id) => api.get(`/birds/${id}`),
  getUniqueStams: () => api.get('/birds/stams'),
  create: (data) => api.post('/birds', data),
  update: (id, data) => api.put(`/birds/${id}`, data),
  delete: (id) => api.delete(`/birds/${id}`),
};

// Pairs API
export const pairsApi = {
  getAll: (activeOnly) => api.get('/pairs', { params: { active_only: activeOnly } }),
  getById: (id) => api.get(`/pairs/${id}`),
  create: (data) => api.post('/pairs', data),
  update: (id, data) => api.put(`/pairs/${id}`, data),
  delete: (id) => api.delete(`/pairs/${id}`),
};

// Clutches API
export const clutchesApi = {
  getAll: (pairId, status) => api.get('/clutches', { params: { pair_id: pairId, status } }),
  getById: (id) => api.get(`/clutches/${id}`),
  create: (data) => api.post('/clutches', data),
  update: (id, data) => api.put(`/clutches/${id}`, data),
  delete: (id) => api.delete(`/clutches/${id}`),
  addEgg: (clutchId, data) => api.post(`/clutches/${clutchId}/eggs`, data),
  updateEgg: (clutchId, eggId, data) => api.put(`/clutches/${clutchId}/eggs/${eggId}`, data),
};

// Contacts API
export const contactsApi = {
  getAll: () => api.get('/contacts'),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getTasks: () => api.get('/dashboard/tasks'),
};

export default api;
