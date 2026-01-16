const express = require('express');
const { getDisputes, resolveDispute, getTournaments, updateTournamentStatus, getNotificationStats, sendBroadcastNotification } = require('../controllers/adminController');
const {
  getGames,
  getGameModes,
  getGameRules,
  createGame,
  updateGameStatus,
  addGameModes,
  updateGameMode,
  addGameRules,
  updateGameRule,
} = require('../controllers/gameController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateDisputeResolution, validateTournamentStatusUpdate } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin); // Only admins can access these routes

router.get('/disputes', getDisputes);
router.get('/tournaments', getTournaments);
router.patch('/tournaments/:id/status', validateTournamentStatusUpdate, updateTournamentStatus);
router.post('/disputes/:id/resolve', validateDisputeResolution, resolveDispute);
router.get('/notifications/stats', getNotificationStats);
router.post('/notifications/broadcast', sendBroadcastNotification);
router.get('/games', getGames);
router.get('/games/:id/modes', getGameModes);
router.get('/games/:id/rules', getGameRules);
router.post('/games', createGame);
router.patch('/games/:id/status', updateGameStatus);
router.post('/games/:id/modes', addGameModes);
router.patch('/game-modes/:id', updateGameMode);
router.post('/games/:id/rules', addGameRules);
router.patch('/game-rules/:id', updateGameRule);

module.exports = router;
