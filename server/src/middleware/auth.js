const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");

const protect = asyncHandler(async (req, res, next) => {
  let token = getCookie(req, "token");

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("Not authenticated", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw new AppError("Not authenticated", 401);
  }
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt) {
    throw new AppError("Password recently changed. Please login again", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Email not verified", 403);
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
