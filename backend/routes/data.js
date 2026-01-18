// routes/data.js
const express = require('express');
const { getGames, getPlatforms, getGameModes, getGameRules } = require('../controllers/dataController');

const router = express.Router();

// These are public endpoints (no auth required)
router.get('/games', getGames);
router.get('/games/:gameId/rules', getGameRules);
router.get('/platforms', getPlatforms);
router.get('/game-modes', getGameModes);

module.exports = router;