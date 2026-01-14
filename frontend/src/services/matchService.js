import api from './api';

export const matchService = {
  getById: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  // Ready status management
  markReady: async (matchId) => {
    const response = await api.post(`/matches/${matchId}/ready`);
    return response.data;
  },

  markNotReady: async (matchId) => {
    const response = await api.post(`/matches/${matchId}/not-ready`);
    return response.data;
  },

  getReadyStatus: async (matchId) => {
    const response = await api.get(`/matches/${matchId}/ready-status`);
    return response.data;
  },
  confirmActive: (matchId) => api.post(`/matches/${matchId}/confirm-active`),

  confirmScore: async (matchId) => {
    const response = await api.post(`/matches/${matchId}/confirm-score`);
    return response.data;
  },

  reportScore: async (matchId, data) => {
    // Check if we have a file to upload
    if (data.evidence_file) {
      const formData = new FormData();
      formData.append('player1_score', data.player1_score);
      formData.append('player2_score', data.player2_score);
      formData.append('evidence', data.evidence_file);

      const response = await api.post(`/matches/${matchId}/report-score`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Fallback to JSON if no file
      const response = await api.post(`/matches/${matchId}/report-score`, {
        player1_score: data.player1_score,
        player2_score: data.player2_score,
        evidence_url: data.evidence_url,
      });
      return response.data;
    }
  },

  dispute: async (matchId, data) => {
    // Check if we have a file to upload
    if (data.evidence_file) {
      const formData = new FormData();
      formData.append('reason', data.reason);
      formData.append('evidence', data.evidence_file);

      const response = await api.post(`/matches/${matchId}/dispute`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Fallback to JSON if no file
      const response = await api.post(`/matches/${matchId}/dispute`, {
        reason: data.reason,
        evidence_url: data.evidence_url,
      });
      return response.data;
    }
  },

  getTournamentMatches: async (id) => {
    const response = await api.get(`/tournaments/${id}/matches`);
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload && Array.isArray(payload.matches)) {
      return payload.matches;
    }
    return [];
  },
};
