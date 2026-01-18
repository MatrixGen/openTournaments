import axios from 'axios';
import { getCurrentCurrencyCode } from '../config/currencyConfig';

// --- Backend base URL with fallback ---
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '⚠️ VITE_API_BASE_URL is missing in environment variables. ' +
    'Falling back to default: /api (production)'
  );
}

// --- Create configured Axios instance ---
const api = axios.create({
  baseURL,
  timeout: 300000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Helper function to get current currency ---
const getCurrentCurrencyHeader = () => {
  try {
    // Get from localStorage first (most up-to-date)
    if (typeof window !== 'undefined') {
      const storedCurrency = localStorage.getItem('selectedCurrency');
      if (storedCurrency) {
        return storedCurrency;
      }
    }
    
    // Fallback to currency config
    return getCurrentCurrencyCode();
  } catch (error) {
    console.warn('Failed to get current currency:', error);
    return 'TZS'; // Default fallback
  }
};

// --- Request Interceptor: attach token AND currency ---
api.interceptors.request.use(
  async (config) => {
    // Add authentication token
    const authType = localStorage.getItem('authType');
    
    if (authType === 'firebase') {
      // For Firebase auth, get fresh token
      try {
        const { auth } = await import('../../firebase');
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (tokenError) {
        console.warn('Failed to get Firebase token:', tokenError);
      }
    } else {
      // Legacy JWT auth
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add currency header to ALL requests
    const currentCurrency = getCurrentCurrencyHeader();
    config.headers['X-Currency'] = currentCurrency;
    
    // Add timestamp for idempotency (optional)
    config.headers['X-Request-Timestamp'] = Date.now();
    
    // For POST/PUT/PATCH requests, also add currency to body if not present
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
      if (config.data && typeof config.data === 'object' && !isFormData) {
        // Only add currency if not already specified in body
        if (!config.data.currency && !config.data.requestCurrency) {
          config.data = {
            ...config.data,
            currency: currentCurrency,
            request_currency: currentCurrency,
            client_currency: currentCurrency
          };
        }
      }
    }
    
    // For GET requests with params, add currency as query param
    if (config.method?.toLowerCase() === 'get' && config.params) {
      if (!config.params.currency) {
        config.params.currency = currentCurrency;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: handle 401 errors ---
api.interceptors.response.use(
  (response) => {
    // You could also add currency validation here if needed
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const authType = localStorage.getItem('authType');
      
      // For Firebase auth, try to refresh the token
      if (authType === 'firebase') {
        try {
          // Dynamic import to avoid circular dependency
          const { auth } = await import('../../firebase');
          const user = auth.currentUser;
          
          if (user) {
            // Get a fresh token
            const newToken = await user.getIdToken(true);
            
            // Retry the request with the new token
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return api.request(error.config);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      // Clear auth data and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('authType');
      localStorage.removeItem('userData');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Add currency info to error logs for debugging
    if (error.config) {
      console.error(`API Error [${error.config.method?.toUpperCase()} ${error.config.url}]:`, {
        currency: error.config.headers['X-Currency'],
        status: error.response?.status,
        error: error.message
      });
    }
    
    return Promise.reject(error);
  }
);

// --- Export additional helper methods ---
api.getCurrentCurrency = getCurrentCurrencyHeader;

// Helper method to update currency dynamically
api.updateCurrency = (currencyCode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedCurrency', currencyCode);
    console.log(`Currency updated to: ${currencyCode}`);
  }
};

// Helper method for requests that need specific currency
api.withCurrency = (currencyCode) => {
  const instance = axios.create({
    baseURL,
    timeout: 300000,
    headers: {
      'Content-Type': 'application/json',
      'X-Currency': currencyCode
    }
  });

  // Add auth interceptor to this instance
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
};

export default api;
