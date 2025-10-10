const express = require('express');
const { reportScore, confirmScore, disputeScore, getMatch } = require('../controllers/matchController');
const { validateScoreReport, validateDispute } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get match details
router.get('/:id', getMatch);

// Report score with optional evidence file
router.post(
  '/:id/report-score',
  uploadSingle('evidence'),        // handle file upload
  validateScoreReport,             // validate input
  reportScore                      // controller
);

// Confirm score
router.post('/:id/confirm-score', confirmScore);

// Dispute a score with optional evidence file
router.post(
  '/:id/dispute',
  uploadSingle('evidence'),        // handle file upload
  validateDispute,                 // validate input
  disputeScore                     // controller
);

module.exports = router;
