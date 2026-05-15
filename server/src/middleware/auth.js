const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");

const protect = asyncHandler(async (req, res, next) => {
  const token = getCookie(req, "token");

  if (!token) {
    throw new AppError("Not authenticated", 401);
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  req.user = user;
  next();
});

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };

module.exports = {
  protect,
  authorize,
};
