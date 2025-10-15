import axios from 'axios';

// Detect backend URL depending on environment
let baseURL = import.meta.env.VITE_API_BASE_URL;

// Fallbacks for local development on PC or LAN
if (!baseURL) {
  // If running on the same machine (localhost)
  if (window.location.hostname === 'localhost') {
    baseURL = 'http://localhost:5000/api';
  } else {
    // If accessing from another device on the LAN (phone, tablet)
    baseURL = 'http://192.168.132.201:5000/api';
  }
}

// Create a configured Axios instance
const api = axios.create({
  baseURL,
  //withCredentials: true, // allow cookies/auth headers if needed
});

// Request Interceptor: attaches auth token to every request
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

// Response Interceptor: handles common errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
