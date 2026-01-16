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
  FORBIDDEN: {
    status: 403,
    message: "You don't have permission to perform this action",
    code: 'FORBIDDEN',
  },
  INVALID_TOURNAMENT_STATUS: {
    status: 400,
    message: 'Invalid tournament status for this action.',
    code: 'INVALID_TOURNAMENT_STATUS',
  },
};

const mapControllerError = (error) => {
  if (error?.name && SEQUELIZE_ERROR_MAP[error.name]) {
    const mapped = SEQUELIZE_ERROR_MAP[error.name];
    return { status: mapped.status, body: { message: mapped.message, code: mapped.code } };
  }

  if (error?.code && SAFE_CODE_MAP[error.code]) {
    const mapped = SAFE_CODE_MAP[error.code];
    return { status: mapped.status, body: { message: mapped.message, code: mapped.code } };
  }

  const status = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;

  let message = 'Something went wrong. Please try again later.';
  if (status === 400) message = 'Invalid data provided.';
  if (status === 401) message = 'Unauthorized.';
  if (status === 403) message = 'Forbidden.';
  if (status === 404) message = 'Resource not found.';

  return { status, body: { message } };
};

module.exports = {
  mapControllerError,
};
