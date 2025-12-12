const Joi = require('joi');

// Custom Joi extensions
const joi = Joi.extend((joi) => ({
  type: 'objectId',
  base: joi.string(),
  messages: {
    'objectId.invalid': '{{#label}} must be a valid object ID'
  },
  validate(value, helpers) {
    // Basic MongoDB ObjectId validation
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { value, errors: helpers.error('objectId.invalid') };
    }
    return { value };
  }
}));

// Validation schemas
const authValidation = {
  register: joi.object({
    email: joi.string().email().required().normalize(),
    password: joi.string().min(8).max(128).required(),
    username: joi.string().alphanum().min(3).max(30).required(),
    profilePicture: joi.string().uri().optional()
  }),

  login: joi.object({
    email: joi.string().email().required().normalize(),
    password: joi.string().required()
  }),

  refreshToken: joi.object({
    refreshToken: joi.string().required()
  })
};

const userValidation = {
  updateProfile: joi.object({
    username: joi.string().alphanum().min(3).max(30).optional(),
    profilePicture: joi.string().uri().optional(),
    status: joi.string().valid('online', 'offline', 'away').optional()
  }),

  search: joi.object({
    q: joi.string().min(2).max(50).required()
  })
};

const channelValidation = {
  create: joi.object({
    name: joi.string().trim().min(1).max(100).required(),
    description: joi.string().trim().max(500).optional(),
    type: joi.string().valid('direct', 'group', 'channel').required(),
    isPrivate: joi.boolean().default(false),
    participantIds: joi.array().items(joi.alternatives().try(
      joi.string().uuid(),
      joi.number().integer().positive()
    )).max(100).optional()

  }),

  update: joi.object({
    name: joi.string().trim().min(1).max(100).optional(),
    description: joi.string().trim().max(500).optional()
  })
};

const messageValidation = {
  send: joi.object({
    content: joi.string().trim().min(1).max(5000).required(),
    replyTo: joi.objectId().optional()
  }),

  markRead: joi.object({
    messageIds: joi.array().items(joi.objectId()).min(1).max(100).required()
  })
};

// Validation middleware generator
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errorDetails
        }
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

module.exports = {
  authValidation,
  userValidation,
  channelValidation,
  messageValidation,
  validate
};