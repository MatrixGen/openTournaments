import axios from 'axios';

// --- Backend base URL with fallback ---
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || '/api'; // fallback to /api for production

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '⚠️ VITE_API_BASE_URL is missing in environment variables. ' +
    'Falling back to default: /api (production)'
  );
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
