const { body } = require('express-validator');

const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 255 }).withMessage('Username must be between 3-255 characters.')
    .isAlphanumeric().withMessage('Username must be alphanumeric.').trim(),
  body('email')
    .isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }).withMessage('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one symbol.'),
  body('phone_number')
  .optional()
  .matches(/^(\+255|0)(7|6|1)\d{8}$/)
  .withMessage('Please provide a valid Tanzanian phone number (e.g., 0712345678 or +255712345678).')

];

// middleware/validation.js
const validateLogin = [
  body('login')
    .notEmpty().withMessage('Email or username is required.').trim(),
  body('password')
    .notEmpty().withMessage('Password is required.')
];

// middleware/validation.js
// Add to the existing exports
const validateTournamentCreation = [
  body('name')
    .isLength({ min: 5, max: 255 }).withMessage('Tournament name must be between 5-255 characters.').trim(),
  body('game_id')
    .isInt({ min: 1 }).withMessage('A valid game must be selected.'),
  body('platform_id')
    .isInt({ min: 1 }).withMessage('A valid platform must be selected.'),
  body('game_mode_id')
    .isInt({ min: 1 }).withMessage('A valid game mode must be selected.'),
  body('format')
    .isIn(['single_elimination', 'double_elimination', 'round_robin']).withMessage('Invalid tournament format.'),
  body('entry_fee')
    .isFloat({ min: 0 }).withMessage('Entry fee must be a positive number.'),
  body('total_slots')
    .isInt({ min: 2, max: 128 }).withMessage('Tournament must have between 2 and 128 slots.'),
  body('start_time')
    .isISO8601().withMessage('Must provide a valid start date/time.')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future.');
      }
      return true;
    }),
  body('prize_distribution')
    .isArray({ min: 1 }).withMessage('Prize distribution must be an array.')
    .custom(value => {
      const totalPercentage = value.reduce((sum, prize) => sum + prize.percentage, 0);
      if (totalPercentage !== 100) {
        throw new Error('Prize distribution percentages must sum to 100.');
      }
      return true;
    })
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateTournamentCreation 
};
