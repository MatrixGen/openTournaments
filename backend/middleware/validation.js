const { body, query } = require('express-validator');

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
    }),
  body('gamer_tag')
    .optional()
    .isLength({ min: 2, max: 10 }).withMessage('Gamer tag must be between 2-10 characters.')
    .trim()
];

// Add to existing validation functions
const validateScoreReport = [
  
  body('player1_score')
    .isInt({ min: 0 })
    .withMessage('Player 1 score must be a non-negative integer.'),
  body('player2_score')
    .isInt({ min: 0 })
    .withMessage('Player 2 score must be a non-negative integer.')
];

// Add to existing validation functions
const validateDisputeResolution = [
  body('resolution')
    .notEmpty().withMessage('Resolution details are required.')
    .isLength({ min: 10 }).withMessage('Resolution must be at least 10 characters long.'),
  body('winner_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Winner ID must be a positive integer.')
];

const validateTournamentStatusUpdate = [
  body('status')
    .isIn(['open', 'locked', 'live', 'completed', 'cancelled']).withMessage('Invalid tournament status.')
];


const validateDispute = [
  body('reason')
    .notEmpty()
    .withMessage('Reason is required.')
    .isLength({ min: 10 })
    .withMessage('Reason must be at least 10 characters long.')
];


const validateEmailVerification = [
  body('token')
    .notEmpty().withMessage('Verification token is required.')
];

const validatePhoneVerification = [
  body('code')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits.')
    .isNumeric().withMessage('Verification code must be numeric.')
];

const validatePasswordResetRequest = [
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email.'),
  body('phone_number')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number.')
];

const validatePasswordReset = [
  body('new_password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }).withMessage('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one symbol.')
];

// Add these to your existing validation.js file
const validateSupportTicket = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 500 }),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('name').optional().trim().isLength({ max: 200 }),
  body('category').optional().isIn(['general', 'tournament', 'payment', 'technical', 'account', 'billing']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('attachments').optional().isArray(),
  body('userId').optional().isInt()
];

const validateFAQSearch = [
  query('query').trim().notEmpty().withMessage('Search query is required'),
  query('category').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const validateFAQRating = [
  body('faqId').trim().notEmpty().withMessage('FAQ ID is required'),
  body('helpful').isBoolean().withMessage('Helpful must be a boolean')
];

module.exports = {
  validateFAQRating,
  validateFAQSearch,
  validateSupportTicket,
  validateRegistration,
  validateLogin,
  validateTournamentCreation,
  validateScoreReport,
  validateDispute,
  validateDisputeResolution,
  validateTournamentStatusUpdate,
  validateEmailVerification,
  validatePhoneVerification,
  validatePasswordResetRequest,
  validatePasswordReset
};
