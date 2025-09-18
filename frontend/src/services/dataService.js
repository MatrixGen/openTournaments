import api from './api';

export const dataService = {
  getGames: async () => {
    const response = await api.get('/data/games');
    return response.data;
  },

  getPlatforms: async () => {
    const response = await api.get('/data/platforms');
    return response.data;
  },

  getGameModes: async (gameId) => {
    const params = gameId ? { game_id: gameId } : {};
    const response = await api.get('/data/game-modes', { params });
    return response.data;
  },
};