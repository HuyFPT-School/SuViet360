const env = require("../config/env");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: err.status || "error",
    message: err.message || "Internal server error",
    ...(env.nodeEnv === "development" ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
