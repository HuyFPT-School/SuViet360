const crypto = require("crypto");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { getCookie } = require("../utils/cookies");

const CSRF_COOKIE_NAME = "csrf-token";

const setCsrfToken = (req, res, next) => {
  const token =
    getCookie(req, CSRF_COOKIE_NAME) || crypto.randomBytes(32).toString("hex");

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  req.csrfToken = token;
  next();
};

const requireCsrfToken = (req, res, next) => {
  const method = req.method.toUpperCase();
  const shouldValidate = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!shouldValidate) {
    return next();
  }

  // Bypass CSRF for external Sepay payment Webhook
  if (req.path === "/api/subscriptions/sepay-webhook") {
    return next();
  }

  // Mobile apps (React Native) don't maintain cookie jars automatically,
  // so the double-submit CSRF pattern (cookie vs header) cannot work.
  // We skip CSRF for mobile clients; they authenticate via JWT tokens instead.
  const isMobile = req.get("x-client-type") === "mobile";
  if (isMobile) {
    return next();
  }

  const cookieToken = getCookie(req, CSRF_COOKIE_NAME);
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError("Invalid CSRF token", 403));
  }

  return next();
};

module.exports = {
  setCsrfToken,
  requireCsrfToken,
};
