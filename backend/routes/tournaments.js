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
      finalizeTournament
    } = require('../controllers/tournamentController');


// Add route

const router = express.Router();

router.use(authenticateToken); // Protect all routes in this file

router.post('/', validateTournamentCreation, createTournament);
router.get('/', getTournaments);
router.post('/:id/join', joinTournament);
router.get('/:id', getTournamentById);
router.get('/my', getMyTournaments);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);
router.post('/:id/start', startTournament);
router.post('/:id/finalize', finalizeTournament);

module.exports = router;