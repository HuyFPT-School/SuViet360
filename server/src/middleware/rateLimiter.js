const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError("Too many attempts, please try again after a minute.", 429));
  }
});

const chatLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  limit: 10, // Limit each IP to 10 requests per windowMs (Issue #11)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError("You are sending messages too fast. Please slow down.", 429));
  }
});

module.exports = {
  authLimiter,
  chatLimiter
};
