const express = require('express');
const { getDisputes, resolveDispute, getTournaments, updateTournamentStatus, getNotificationStats, sendBroadcastNotification } = require('../controllers/adminController');
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

module.exports = router;