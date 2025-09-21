import api from './api';

export const adminService = {
  getDisputes: async () => {
    const response = await api.get('/admin/disputes');
    return response.data;
  },

  resolveDispute: async (disputeId, resolutionData) => {
    const response = await api.post(`/admin/disputes/${disputeId}/resolve`, resolutionData);
    return response.data;
  },

  // Add other admin methods as needed
};