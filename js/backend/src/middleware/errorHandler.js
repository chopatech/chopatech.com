const logger = require("../utils/logger");

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  logger.error(err.message, { status, path: req.path, stack: err.stack });

  res.status(status).json({
    error: {
      message: status === 500 ? "Something went wrong. Please try again." : err.message,
      details: status < 500 ? err.details : undefined,
    },
  });
}

module.exports = errorHandler;
module.exports.ApiError = ApiError;
