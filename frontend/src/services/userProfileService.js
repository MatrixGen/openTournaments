import api from './api';

export const userProfileService = {
  // Get public profile
  getPublicProfile: async (userId) => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },

  // Get user's public posts
  getUserPosts: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/posts`, { params });
    return response.data;
  },

  // Create a post
  createPost: async (postData) => {
    const response = await api.post('/users/posts', postData);
    return response.data;
  },

  // Delete a post
  deletePost: async (postId) => {
    const response = await api.delete(`/users/posts/${postId}`);
    return response.data;
  },

  // Get user's gaming stats
  getUserStats: async (userId) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  // Follow/unfollow user
  followUser: async (userId) => {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
  },

  unfollowUser: async (userId) => {
    const response = await api.delete(`/users/${userId}/follow`);
    return response.data;
  },

  // Get user's followers/following
  getFollowers: async (userId) => {
    const response = await api.get(`/users/${userId}/followers`);
    return response.data;
  },

  getFollowing: async (userId) => {
    const response = await api.get(`/users/${userId}/following`);
    return response.data;
  },
};