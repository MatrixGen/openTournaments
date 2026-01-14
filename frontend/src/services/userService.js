import api from './api';

export const userService = {
  // Get user profile stats
  getUserStats: async () => {
    try {
      const response = await api.get('/user/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user stats'
      };
    }
  },

  // Get user tournaments with pagination
  getUserTournaments: async (params = {}) => {
    try {
      const response = await api.get('/user/tournaments', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user tournaments'
      };
    }
  },

  // Get user achievements
  getUserAchievements: async () => {
    try {
      const response = await api.get('/user/achievements');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch achievements'
      };
    }
  },

  // Update user profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/user/profile', data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile'
      };
    }
  },

  // Get user activity log
  getUserActivity: async (params = {}) => {
    try {
      const response = await api.get('/user/activity', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch activity'
      };
    }
  },

  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload avatar'
      };
    }
  },
  

  // 🔥 NEW: Add password for Google OAuth users
  addGooglePassword: async (password) => {
    try {
      const response = await api.post('/auth/google/add-password', { password });
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Password set successfully!'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to set password'
      };
    }
  },

  // 🔥 NEW: Change password for Google OAuth users
  changeGooglePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/google/change-password', {
        currentPassword,
        newPassword
      });
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Password changed successfully!'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to change password'
      };
    }
  },

  // 🔥 NEW: Check if Google user has password
  checkGooglePasswordStatus: async () => {
    try {
      // This endpoint should return whether Google user has password
      const response = await api.get('/user/profile');
      return {
        success: true,
        data: response.data,
        hasPassword: response.data.user?.hasPassword || false
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check password status'
      };
    }
  },

  // 🔥 NEW: Validate password for Google users
  validateGooglePassword: (password) => {
    const errors = [];
    
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
};
