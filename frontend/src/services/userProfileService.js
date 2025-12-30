// services/userProfileService.js
import api from "./api";

export const userProfileService = {
  // Get public profile
  getPublicProfile: async (userId) => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  // Follow user
  followUser: async (userId) => {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
  },

  // Unfollow user
  unfollowUser: async (userId) => {
    const response = await api.delete(`/users/${userId}/follow`);
    return response.data;
  },

  // Get user's followers
  getFollowers: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/followers`, { params });
    return response.data;
  },

  // Get users that a user is following
  getFollowing: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/following`, { params });
    return response.data;
  },

  // Get user's friends
  getFriends: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/friends`, { params });
    return response.data;
  },

  // Get user's tournaments
  getUserTournaments: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/tournaments`, { params });
    return response.data;
  },

  // Get user's achievements
  getUserAchievements: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/achievements`, { params });
    return response.data;
  },

  // Search users
  searchUsers: async (query = "", params = {}) => {
    const response = await api.get("/users/search", {
      params: {
        query,
        ...params,
        currentUserId: params.currentUserId || null,
      },
    });
    return response.data;
  },

  // Get users list
  getUsersList: async (params = {}) => {
    const response = await api.get("/users/list", {
      params: {
        ...params,
        currentUserId: params.currentUserId || null,
      },
    });
    return response.data;
  },

  // Get suggested users to follow
  getSuggestedUsers: async (limit = 10) => {
    const response = await api.get("/users/suggested", {
      params: { limit },
    });
    return response.data;
  },

  // Get top players by category
  getTopPlayers: async (category = "winrate", limit = 10) => {
    const response = await api.get("/users/top", {
      params: { category, limit },
    });
    return response.data;
  },

  // Batch check follow status for multiple users
  checkMultipleFollowStatus: async (userIds) => {
    const response = await api.post("/users/follow-status/batch", {
      userIds,
    });
    return response.data;
  },

  // Check follow status for a single user
  checkFollowStatus: async (userId) => {
    const response = await api.get(`/users/${userId}/follow-status`);
    return response.data;
  },

  // Report a user
  reportUser: async (userId, reportData) => {
    const response = await api.post(`/users/${userId}/report`, reportData);
    return response.data;
  },

};