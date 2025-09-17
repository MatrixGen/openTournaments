const express = require('express');
const { reportScore, confirmScore, disputeScore, getMatch } = require('../controllers/matchController');
const { validateScoreReport, validateDispute } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/:id', getMatch);
router.post('/:id/report-score', validateScoreReport, reportScore);
router.post('/:id/confirm-score', confirmScore);
router.post('/:id/dispute', validateDispute, disputeScore);

module.exports = router;