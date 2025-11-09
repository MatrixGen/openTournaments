import axios from 'axios';

// --- Require backend URL from environment ---
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim();

if (!baseURL) {
  console.error(
    '❌ ERROR: VITE_API_BASE_URL is missing in your environment configuration.\n' +
    'Please define it in your .env or .env.production file, e.g.:\n' +
    'VITE_API_BASE_URL=http://138.197.39.55:5000/api'
  );
  throw new Error('Missing required environment variable: VITE_API_BASE_URL');
}

// --- Create configured Axios instance ---
const api = axios.create({
  baseURL,
  timeout: 10000, // 10s timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor: attach token ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: handle 401 errors ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
