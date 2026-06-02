const env = require("../config/env");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Handle Multer file upload errors
  if (err.name === "MulterError") {
    let message;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds the allowed limit (max 5 MB)";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected file field: ${err.field}`;
    } else {
      message = `File upload error: ${err.message}`;
    }
    return res.status(400).json({
      status: "fail",
      message,
    });
  }

  // Handle manual file filter errors (thrown as plain Error)
  if (err.message && err.message.startsWith("Tilemap JSON") || err.message && err.message.startsWith("Tileset images")) {
    error.statusCode = 400;
    error.status = "fail";
  }

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
