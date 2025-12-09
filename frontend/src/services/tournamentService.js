import api from './api';

export const tournamentService = {
  getAll: async (params = {}) => {
    const response = await api.get('/tournaments', { params });
    return response.data?.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
  },

  getMyTournaments: async (params = {}) => {
    const response = await api.get('/tournaments/my', { params });
    return response.data;
  },

  create: async (tournamentData) => {
    const response = await api.post('/tournaments', tournamentData);
    return response.data;
  },

  update: async (id, tournamentData) => {
    const response = await api.put(`/tournaments/${id}`, tournamentData);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.delete(`/tournaments/${id}`);
    return response.data;
  },

  start: async (id) => {
    const response = await api.post(`/tournaments/${id}/start`);
    return response.data;
  },

  finalize: async (id) => {
    const response = await api.post(`/tournaments/${id}/finalize`);
    return response.data;
  },

  join: async (tournamentId, gamerTag) => {
    const response = await api.post(`/tournaments/${tournamentId}/join`, {
      gamer_tag: gamerTag
    });
    return response.data;
  },
  
};