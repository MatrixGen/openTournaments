const successResponse = (data, message = 'Success', meta = {}) => {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
};

const errorResponse = (message, code = 'ERROR', details = null) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
};

module.exports = {
  successResponse,
  errorResponse
};