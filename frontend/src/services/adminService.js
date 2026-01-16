import api from './api';

const normalizeError = (error) => {
  const payload = error?.response?.data;
  if (payload?.message) {
    return { message: payload.message, code: payload.code };
  }

  return { message: 'Something went wrong. Please try again later.' };
};

const throwNormalizedError = (error) => {
  const normalized = normalizeError(error);
  const err = new Error(normalized.message);
  if (normalized.code) {
    err.code = normalized.code;
  }
  throw err;
};

const unwrapListResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

export const adminService = {
  getGames: async () => {
    try {
      const response = await api.get('/admin/games');
      return unwrapListResponse(response.data);
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  getGameModes: async (gameId) => {
    try {
      const response = await api.get(`/admin/games/${gameId}/modes`);
      return unwrapListResponse(response.data);
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  getGameRules: async (gameId) => {
    try {
      const response = await api.get(`/admin/games/${gameId}/rules`);
      return unwrapListResponse(response.data);
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  createGame: async (payload) => {
    try {
      const response = await api.post('/admin/games', payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  updateGameStatus: async (gameId, payload) => {
    try {
      const response = await api.patch(`/admin/games/${gameId}/status`, payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  addGameModes: async (gameId, payload) => {
    try {
      const response = await api.post(`/admin/games/${gameId}/modes`, payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  updateGameMode: async (modeId, payload) => {
    try {
      const response = await api.patch(`/admin/game-modes/${modeId}`, payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  addGameRules: async (gameId, payload) => {
    try {
      const response = await api.post(`/admin/games/${gameId}/rules`, payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  updateGameRule: async (ruleId, payload) => {
    try {
      const response = await api.patch(`/admin/game-rules/${ruleId}`, payload);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  getDisputes: async () => {
    try {
      const response = await api.get('/admin/disputes');
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  resolveDispute: async (disputeId, resolutionData) => {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/resolve`, resolutionData);
      return response.data;
    } catch (error) {
      throwNormalizedError(error);
    }
  },

  // Add other admin methods as needed
};
