/**
 * API client for HomeServer.
 * Axios instance with auth interceptor and 401 auto-logout.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: window.location.origin,
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 auto-logout
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired or invalid — auto-logout
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;