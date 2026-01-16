const SEQUELIZE_ERROR_MAP = {
  SequelizeValidationError: {
    status: 400,
    message: 'Invalid data provided.',
    code: 'VALIDATION_ERROR',
  },
  SequelizeUniqueConstraintError: {
    status: 409,
    message: 'Resource already exists.',
    code: 'RESOURCE_ALREADY_EXISTS',
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

const SAFE_CODE_MAP = {
  GAME_INCOMPLETE: {
    status: 400,
    message: 'Game is incomplete. Add at least one active mode, one active rule, and a logo.',
    code: 'GAME_INCOMPLETE',
  },
};

const mapGameControllerError = (error) => {
  if (error?.name && SEQUELIZE_ERROR_MAP[error.name]) {
    const mapped = SEQUELIZE_ERROR_MAP[error.name];
    return { status: mapped.status, body: { message: mapped.message, code: mapped.code } };
  }

  if (error?.code && SAFE_CODE_MAP[error.code]) {
    const mapped = SAFE_CODE_MAP[error.code];
    return { status: mapped.status, body: { message: mapped.message, code: mapped.code } };
  }

  return {
    status: 500,
    body: { message: 'Something went wrong. Please try again later.' },
  };
};

module.exports = {
  mapGameControllerError,
};
