import api from './api';

export const notificationService = {
  getAll: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  sendFcmToken:async(token)=>{
    alert('token is being sent to backend:',token)
    await api.post('/notifications/device-token',{token})
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
};