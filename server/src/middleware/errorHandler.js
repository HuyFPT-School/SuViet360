const env = require("../config/env");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    error.statusCode = 400;
    error.status = "fail";
    error.message = Object.values(err.errors).map((el) => el.message).join(". ");
  }

  // Handle Mongoose CastError (e.g. invalid object ID)
  if (err.name === "CastError") {
    error.statusCode = 400;
    error.status = "fail";
    error.message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    error.statusCode = 400;
    error.status = "fail";
    const field = Object.keys(err.keyValue)[0];
    error.message = `Duplicate field value: ${field}. Please use another value!`;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    status: error.status || "error",
    message: error.message || "Internal server error",
    ...(env.nodeEnv === "development" ? { stack: error.stack } : {}),
  });
};

module.exports = errorHandler;
