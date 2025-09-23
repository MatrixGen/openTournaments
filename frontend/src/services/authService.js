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
  },
  // Email Verification
  sendEmailVerification: async () => {
    const response = await api.post('/auth/verification/email/send');
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post('/auth/verification/email/verify', { token });
    return response.data;
  },

  // Phone Verification
  sendPhoneVerification: async () => {
    const response = await api.post('/auth/verification/phone/send');
    return response.data;
  },

  verifyPhone: async (code) => {
    const response = await api.post('/auth/verification/phone/verify', { code });
    return response.data;
  },

  // Password Reset - Email
  requestPasswordResetEmail: async (email) => {
    const response = await api.post('/auth/verification/password/reset/email', { email });
    return response.data;
  },

  // Password Reset - SMS
  requestPasswordResetSMS: async (phone) => {
    const response = await api.post('/auth/verification/password/reset/sms', { phone });
    return response.data;
  },

  // Password Reset with Token (Email)
  resetPasswordWithToken: async (token, new_password) => {
    const response = await api.post('/auth/verification/password/reset/token', {
      token,
      new_password
    });
    return response.data;
  },

  // Password Reset with Code (SMS)
  resetPasswordWithCode: async (code, new_password) => {
    const response = await api.post('/auth/verification/password/reset/code', {
      code,
      new_password
    });
    return response.data;
  },
};