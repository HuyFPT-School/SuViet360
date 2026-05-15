const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const env = require("../config/env");

const signToken = (id) =>
  jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const sendAuthResponse = (res, statusCode, user, message) => {
  const token = signToken(user._id);

  res.cookie("token", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    message,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already in use", 400);
  }

  const user = await User.create({ name, email, password });
  sendAuthResponse(res, 201, user, "User registered successfully");
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  sendAuthResponse(res, 200, user, "Login successful");
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
});

const adminOnly = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Admin resource",
  });
});

const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    ...cookieOptions,
    maxAge: 0,
  });

  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

module.exports = {
  register,
  login,
  me,
  logout,
  adminOnly,
};
