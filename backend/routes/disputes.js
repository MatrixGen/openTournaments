const { getDisputes, resolveDispute, getDispute } = require('../controllers/disputeController');

router.get('/:id', getDispute);