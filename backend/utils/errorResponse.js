const SEQUELIZE_ERROR_MAP = {
  SequelizeValidationError: {
    status: 400,
    message: 'Invalid data provided.',
    code: 'VALIDATION_ERROR',
  },
  SequelizeUniqueConstraintError: {
    status: 409,
    message: 'Already exists.',
    code: 'ALREADY_EXISTS',
  },
  SequelizeForeignKeyConstraintError: {
    status: 400,
    message: 'Invalid reference.',
    code: 'INVALID_REFERENCE',
  },
  SequelizeDatabaseError: {
    status: 500,
    message: 'Server configuration error. Please try again later.',
    code: 'DATABASE_ERROR',
  },
};

const mapSequelizeError = (error) => {
  if (!error || !error.name) return null;
  return SEQUELIZE_ERROR_MAP[error.name] || null;
};

const buildErrorResponse = (error, options = {}) => {
  const mapped = mapSequelizeError(error);
  if (mapped) {
    return {
      status: mapped.status,
      body: { message: mapped.message, code: mapped.code },
    };
  }

  const status = error?.statusCode || error?.status || options.fallbackStatus || 500;
  const code = error?.code || options.fallbackCode;
  let message = options.fallbackMessage || error?.publicMessage;

  if (!message) {
    message =
      status >= 500
        ? 'Something went wrong. Please try again later.'
        : error?.message || 'Request failed.';
  }

  return {
    status,
    body: code ? { message, code } : { message },
  };
};

module.exports = {
  buildErrorResponse,
};
