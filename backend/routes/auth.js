// routes/auth.js
const express = require('express');
const { register, login } = require('../controllers/authController'); 
const { validateRegistration, validateLogin } = require('../middleware/validation'); 

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login); 

module.exports = router;