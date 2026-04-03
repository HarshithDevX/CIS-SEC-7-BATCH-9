import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

export default api;

// ── Sites ────────────────────────────────────────────────────────────
export const getSites       = ()              => api.get('/sites');
export const addSite        = (data)          => api.post('/sites', data);
export const deleteSite     = (id)            => api.delete(`/sites/${id}`);
export const updateSite     = (id, data)      => api.patch(`/sites/${id}`, data);
export const manualCheck    = (id)            => api.post(`/sites/${id}/check`);

// ── History / Diff ───────────────────────────────────────────────────
export const getHistory     = (id, limit=30)  => api.get(`/sites/${id}/history?limit=${limit}`);
export const getLatestDiff  = (id)            => api.get(`/sites/${id}/diff/latest`);
export const compareDiff    = (id, a, b)      => api.get(`/sites/${id}/diff/${a}/${b}`);
