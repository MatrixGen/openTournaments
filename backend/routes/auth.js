// routes/auth.js
const express = require('express');
const { register, login,validateChatToken,refreshChatToken } = require('../controllers/authController'); 
const { validateRegistration, validateLogin } = require('../middleware/validation'); 

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login); 

router.post('/chat/refresh',refreshChatToken);
router.post('/chat/validate',validateChatToken);

module.exports = router;