// routes/tournaments.js
const express = require('express');

const { validateTournamentCreation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { 
  createTournament,
  getTournaments, 
  joinTournament,
  getTournamentById,
  getMyTournaments,
  updateTournament,
  deleteTournament,
  startTournament,
  finalizeTournament,
  getTournamentMatches,
  getTournamentBracket,
  getTournamentManagementInfo,
  advanceTournament,
  generateTournamentBracket,
  getTournamentShareLink,
  handleSharedTournamentLink
} = require('../controllers/tournamentController');

const router = express.Router();

// Public routes
router.get('/', getTournaments);

// Handle shared tournament link (public access)
router.get('/:id/share', handleSharedTournamentLink);

// Short URL redirect (optional)
router.get('/t/:hash', async (req, res) => {
  // You could implement short URL decoding here
  // For now, redirect to the share handler
  res.redirect(`/api/tournaments/${req.params.hash}/share`);
});

// Authenticated routes
router.use(authenticateToken);

// Specific routes should come before parameterized routes

router.post('/', validateTournamentCreation, createTournament);
router.get('/my', getMyTournaments);
// Parameterized routes
router.get('/:id', getTournamentById);
router.post('/:id/join', joinTournament);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);
router.post('/:id/start', startTournament);
router.post('/:id/finalize', finalizeTournament);
router.get('/:id/matches', getTournamentMatches);
router.get('/:id/bracket', getTournamentBracket);
router.post('/:id/generate-bracket', generateTournamentBracket);
router.get('/:id/management', getTournamentManagementInfo);
router.post('/:id/advance', advanceTournament);
router.get('/:id/share-link',getTournamentShareLink);

module.exports = router;