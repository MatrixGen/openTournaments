// routes/tournaments.js
const express = require('express');

const { validateTournamentCreation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
// Update the import
const { createTournament, getTournaments, joinTournament, getTournamentById } = require('../controllers/tournamentController');

// Add this route


const router = express.Router();

router.use(authenticateToken); // Protect all routes in this file

router.post('/', validateTournamentCreation, createTournament);
router.get('/', getTournaments);
router.post('/:id/join', joinTournament);
router.get('/:id', getTournamentById);

module.exports = router;