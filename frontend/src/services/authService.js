import api from './api';

export const authService = {
  login: async (credentials) => {
    // The backend expects { login, password } where login can be email or username
    const payload = {
      login: credentials.email, 
      password: credentials.password
    };
    
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  signup: async (userData) => {
    // The backend expects { username, email, password, phone_number (optional) }
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateNotificationPreferences: async (preferences) => {
    const response = await api.put('/users/preferences/notifications', preferences);
    return response.data;
  }
};