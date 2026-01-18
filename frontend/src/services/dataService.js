import api from './api';

export const dataService = {
  getGames: async () => {
    const response = await api.get('/data/games');
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload && Array.isArray(payload.games)) {
      return payload.games;
    }
    return [];
  },

  getPlatforms: async () => {
    const response = await api.get('/data/platforms');
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload && Array.isArray(payload.platforms)) {
      return payload.platforms;
    }
    return [];
  },

  getGameModes: async (gameId) => {
    const params = gameId ? { game_id: gameId } : {};
    const response = await api.get('/data/game-modes', { params });
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload && Array.isArray(payload.game_modes)) {
      return payload.game_modes;
    }
    return [];
  },
  getGameRules: async (gameId, params = {}) => {
    const response = await api.get(`/data/games/${gameId}/rules`, { params });
    return response.data;
  },

  getGame: async (gameId) => {
    const response = await api.get(`/data/games/${gameId}`);
    return response.data;
  }
};
