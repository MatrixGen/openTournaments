// controllers/dataController.js
const { Game, Platform, GameMode } = require('../models');

const getGames = async (req, res, next) => {
  try {
    const games = await Game.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'logo_url'] // Only send necessary data
    });
    res.json(games);
  } catch (error) {
    next(error);
  }
};

const getPlatforms = async (req, res, next) => {
  try {
    const platforms = await Platform.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'icon_url']
    });
    res.json(platforms);
  } catch (error) {
    next(error);
  }
};

const getGameModes = async (req, res, next) => {
  try {
    const { game_id } = req.query;

    const whereClause = { status: 'active' };
    if (game_id) whereClause.game_id = game_id;

    const gameModes = await GameMode.findAll({
      where: whereClause,
      attributes: ['id', 'game_id', 'name'],
      include: [{
        model: Game,
        as: 'game', 
        attributes: ['name'],
      }]
    });
    res.json(gameModes);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGames,
  getPlatforms,
  getGameModes
};