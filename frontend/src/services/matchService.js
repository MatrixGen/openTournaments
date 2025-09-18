import api from './api';

export const matchService = {
  getById: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  reportScore: async (matchId, scoreData) => {
    const response = await api.post(`/matches/${matchId}/report-score`, scoreData);
    return response.data;
  },

  confirmScore: async (matchId) => {
    const response = await api.post(`/matches/${matchId}/confirm-score`);
    return response.data;
  },

  dispute: async (matchId, disputeData) => {
    const response = await api.post(`/matches/${matchId}/dispute`, disputeData);
    return response.data;
  },
};