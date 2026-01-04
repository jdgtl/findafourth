import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('player');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  completeProfile: (data) => api.put('/auth/complete-profile', data),
};

// Player APIs
export const playerAPI = {
  list: (params) => api.get('/players', { params }),
  get: (id) => api.get(`/players/${id}`),
  update: (id, data) => api.put(`/players/${id}`, data),
  delete: (id) => api.delete(`/players/${id}`),
};

// Request APIs
export const requestAPI = {
  list: () => api.get('/requests'),
  create: (data) => api.post('/requests', data),
  get: (id) => api.get(`/requests/${id}`),
  update: (id, data) => api.put(`/requests/${id}`, data),
  cancel: (id) => api.delete(`/requests/${id}`),
  respond: (id) => api.post(`/requests/${id}/respond`),
  updateResponse: (requestId, responseId, status) =>
    api.put(`/requests/${requestId}/responses/${responseId}`, { status }),
};

// Crew APIs
export const crewAPI = {
  list: () => api.get('/crews'),
  create: (data) => api.post('/crews', data),
  get: (id) => api.get(`/crews/${id}`),
  update: (id, data) => api.put(`/crews/${id}`, data),
  delete: (id) => api.delete(`/crews/${id}`),
  addMember: (crewId, playerId) => api.post(`/crews/${crewId}/members?player_id=${playerId}`),
  removeMember: (crewId, playerId) => api.delete(`/crews/${crewId}/members/${playerId}`),
  join: (id) => api.post(`/crews/${id}/join`),
  leave: (id) => api.post(`/crews/${id}/leave`),
};

// Favorite APIs
export const favoriteAPI = {
  list: () => api.get('/favorites'),
  add: (playerId) => api.post(`/favorites/${playerId}`),
  remove: (playerId) => api.delete(`/favorites/${playerId}`),
};

// Availability APIs
export const availabilityAPI = {
  list: () => api.get('/availability'),
  create: (data) => api.post('/availability', data),
  delete: (id) => api.delete(`/availability/${id}`),
};

// Utility APIs
export const utilityAPI = {
  getClubSuggestions: () => api.get('/clubs/suggestions'),
};

export default api;
