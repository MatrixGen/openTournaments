// controllers/dataController.js
const { Game, Platform, GameMode, GameRule } = require('../models');
const { Op } = require('sequelize');

const getGames = async (req, res, next) => {
  try {
    const games = await Game.findAll({
      where: { status: 'active' },
      // Return all game fields for use in deep linking and full game info
      attributes: { exclude: ['created_at', 'updated_at'] }
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

const getGameRules = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const {
      active,
      includeInactive,
      type,
      q,
      limit = 50,
      offset = 0,
      fields = 'full'
    } = req.query;

    // Validate gameId
    const gameIdNum = parseInt(gameId, 10);
    if (isNaN(gameIdNum) || gameIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID'
      });
    }

    // Check if game exists
    const game = await Game.findByPk(gameIdNum);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Build where clause
    const whereClause = { game_id: gameIdNum };

    // Active filter (default: only active rules)
    if (includeInactive !== '1') {
      if (active === '0') {
        whereClause.is_active = false;
      } else if (active === '1') {
        whereClause.is_active = true;
      } else {
        // Default: only active and currently effective
        whereClause.is_active = true;
        whereClause.effective_from = { [Op.lte]: new Date() };
        whereClause[Op.or] = [
          { effective_to: null },
          { effective_to: { [Op.gte]: new Date() } }
        ];
      }
    }

    // Type filter
    if (type && ['general', 'tournament', 'gameplay', 'scoring', 'other'].includes(type)) {
      whereClause.type = type;
    }

    // Search filter
    if (q && q.trim()) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${q.trim()}%` } },
        { content: { [Op.iLike]: `%${q.trim()}%` } }
      ];
    }

    // Determine attributes based on fields param
    let attributes;
    if (fields === 'summary') {
      attributes = ['id', 'title', 'type', 'priority', 'version', 'effective_from', 'effective_to'];
    } else {
      // full - return all fields except timestamps
      attributes = { exclude: ['created_at', 'updated_at'] };
    }

    // Pagination with safe limits
    const safeLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const safeOffset = parseInt(offset, 10) || 0;

    // Fetch rules
    const rules = await GameRule.findAll({
      where: whereClause,
      attributes,
      order: [
        ['priority', 'DESC'],
        ['type', 'ASC'],
        ['id', 'ASC']
      ],
      limit: safeLimit,
      offset: safeOffset
    });

    res.json({
      success: true,
      game_id: gameIdNum,
      count: rules.length,
      rules
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGames,
  getPlatforms,
  getGameModes,
  getGameRules
};