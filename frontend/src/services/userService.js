import api from './api';

export const userService = {
  // Get user profile stats
  getUserStats: async () => {
    try {
      const response = await api.get('/users/stats');
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
      const response = await api.get('/users/tournaments', { params });
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
      const response = await api.get('/users/achievements');
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
      const response = await api.put('/users/profile', data);
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
      const response = await api.get('/users/activity', { params });
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
  }
};