// routes/tournaments.js
const express = require('express');

const { validateTournamentCreation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { createTournament,
     getTournaments, 
     joinTournament,
      getTournamentById,
      getMyTournaments,
      updateTournament ,
      deleteTournament ,
      startTournament,
      finalizeTournament,
      getTournamentMatches,
      getTournamentBracket,
      getTournamentManagementInfo,
      advanceTournament,
      generateTournamentBracket
    } = require('../controllers/tournamentController');


// Add route

const router = express.Router();

router.use(authenticateToken); // Protect all routes in this file

router.post('/', validateTournamentCreation, createTournament);
router.get('/', getTournaments);
router.get('/my', getMyTournaments);
router.post('/:id/join', joinTournament);
router.get('/:id', getTournamentById);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);
router.post('/:id/start', startTournament);
router.post('/:id/finalize', finalizeTournament);
router.get('/:id/matches', getTournamentMatches);
router.get('/:id/bracket', getTournamentBracket);
router.post('/:id/generate-bracket', generateTournamentBracket);
router.get('/:id/management', getTournamentManagementInfo);
router.post('/:id/advance', advanceTournament);


module.exports = router;