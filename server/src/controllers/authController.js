const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const env = require("../config/env");
const { redisClient } = require("../config/redis");
const { sendEmail, buildEmailTemplate } = require("../utils/mailer");
const { getCookie } = require("../utils/cookies");
const { OAuth2Client } = require("google-auth-library");

const signAccessToken = (id) =>
  jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const signRefreshToken = (id) =>
  jwt.sign({ id }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

const normalizeEmail = (value) => `${value || ""}`.trim().toLowerCase();
const isValidEmail = (email) => {
  const atIndex = email.indexOf("@");
  const dotIndex = email.lastIndexOf(".");
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
};

const accessCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const ensureRedisClient = () => {
  if (!redisClient) {
    throw new AppError("Redis is not configured", 500);
  }

  return redisClient;
};

const refreshTokenTtlSeconds = env.redisRefreshTtlMinutes * 60;
const buildRefreshTokenKey = (token) => `refresh:${token}`;

const storeRefreshToken = async (userId, token) => {
  const client = ensureRedisClient();
  await client.set(buildRefreshTokenKey(token), String(userId), {
    EX: refreshTokenTtlSeconds,
  });
};

const getRefreshTokenUserId = async (token) => {
  const client = ensureRedisClient();
  return client.get(buildRefreshTokenKey(token));
};

const deleteRefreshToken = async (token) => {
  const client = ensureRedisClient();
  await client.del(buildRefreshTokenKey(token));
};

const revokeAllRefreshTokensForUser = async (userId) => {
  const client = ensureRedisClient();
  const keys = await client.keys("refresh:*");
  if (!keys || keys.length === 0) return;

  for (const k of keys) {
    try {
      const v = await client.get(k);
      if (v === String(userId)) {
        await client.del(k);
      }
    } catch (e) {
      // ignore per-key errors
    }
  }
};

const ensureStrongPassword = (password) => {
  if (!password) {
    throw new AppError("Password is required", 400);
  }

  const rules = [
    {
      test: (value) => value.length >= 8,
      message: "Password must be at least 8 characters",
    },
    {
      test: (value) => /[A-Z]/.test(value),
      message: "Password must include an uppercase letter",
    },
    {
      test: (value) => /[a-z]/.test(value),
      message: "Password must include a lowercase letter",
    },
    {
      test: (value) => /[0-9]/.test(value),
      message: "Password must include a number",
    },
    {
      test: (value) => /[^A-Za-z0-9]/.test(value),
      message: "Password must include a special character",
    },
  ];

  const failedRule = rules.find((rule) => !rule.test(password));
  if (failedRule) {
    throw new AppError(failedRule.message, 400);
  }
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("token", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res.cookie("token", "", {
    ...accessCookieOptions,
    maxAge: 0,
  });
  res.cookie("refreshToken", "", {
    ...refreshCookieOptions,
    maxAge: 0,
  });
};

const sendAuthResponse = async (res, statusCode, user, message) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  await user.save({ validateBeforeSave: false });
  // Don't fail the response if Redis is unavailable
  try {
    await storeRefreshToken(user._id, refreshToken);
  } catch (_err) {
    // Redis may not be configured — non-critical
  }
  setAuthCookies(res, accessToken, refreshToken);
  res.status(statusCode).json({
    status: "success",
    message,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        birthDate: user.birthDate,
        gender: user.gender,
        address: user.address,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiry: user.subscriptionExpiry,
      },
    },
  });
};

const sendVerificationEmail = async (user, token, req) => {
  const isMobile = req && req.get("x-client-type") === "mobile";
  const verifyUrl = isMobile
    ? `${env.backendUrl}/api/auth/verify-email?token=${token}`
    : `${env.clientUrl}/verify-email?token=${token}`;

  const subject = "Verify your email";
  const text = `Hello ${user.name || "there"},\n\nPlease verify your email by visiting: ${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`;
  const html = buildEmailTemplate({
    title: "Verify your email",
    preheader: "Confirm your email address to complete registration.",
    greeting: `Hello ${user.name || "there"},`,
    intro:
      "Thanks for joining SuViet360. Please confirm your email address to finish setting up your account.",
    ctaLabel: "Verify email",
    ctaUrl: verifyUrl,
    note: "If the button does not work, copy and paste the link into your browser.",
    footerNote: "This link expires in 24 hours.",
  });

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

const sendResetPasswordEmail = async (user, token, req) => {
  const isMobile = req && req.get("x-client-type") === "mobile";
  const resetUrl = isMobile
    ? `${env.backendUrl}/api/auth/reset-password?token=${token}`
    : `${env.clientUrl}/reset-password?token=${token}`;

  const subject = "Reset your password";
  const text = `Hello ${user.name || "there"},\n\nReset your password by visiting: ${resetUrl}\n\nThis link will expire in 1 hour.`;
  const html = buildEmailTemplate({
    title: "Reset your password",
    preheader: "Create a new password for your SuViet360 account.",
    greeting: `Hello ${user.name || "there"},`,
    intro:
      "We received a request to reset your password. Use the button below to set a new one.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    note: "If you did not request this, you can ignore this email.",
    footerNote: "This link expires in 1 hour.",
  });

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new AppError("Please provide a valid email", 400);
  }

  ensureStrongPassword(password);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Email already in use", 400);
  }

  const user = await User.create({ name, email: normalizedEmail, password });
  const verificationToken = user.createEmailVerificationToken();

  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, verificationToken, req);

  res.status(201).json({
    status: "success",
    message: "Registration successful. Please verify your email.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new AppError("Email and password are required", 400);
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError("Please provide a valid email", 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password"
  );
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.isLocked) {
    throw new AppError("Tài khoản của bạn đã bị khóa.", 403);
  }

  await sendAuthResponse(res, 200, user, "Login successful");
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new AppError("Verification token is required", 400);
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Verification token is invalid or expired", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  // Save verification to DB FIRST so it persists even if sendAuthResponse fails
  await user.save({ validateBeforeSave: false });

  // Detect browser (phone/emulator) vs API call (Next.js client)
  const acceptHeader = req.get("Accept") || "";
  const isApiCall = acceptHeader.includes("application/json");

  if (isApiCall) {
    // API call → return JSON with auth cookies (Next.js client flow)
    await sendAuthResponse(res, 200, user, "Email verified successfully");
  } else {
    // Browser → show simple HTML success page (mobile phone/emulator)
    res.status(200).set("Content-Type", "text/html; charset=utf-8").send(`
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Xác thực thành công</title>
<style>
  body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f7f3e9;color:#2a2016}
  .card{text-align:center;padding:40px 30px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:400px}
  .icon{font-size:56px;margin-bottom:12px}
  h1{font-size:22px;margin:0 0 8px;color:#4a3520}
  p{font-size:15px;color:#6b5a3e;margin:0}
</style>
</head>
<body>
<div class="card">
  <div class="icon">✅</div>
  <h1>Email đã được xác thực!</h1>
  <p>${user.email} đã sẵn sàng.<br>Bạn có thể quay lại app để đăng nhập.</p>
</div>
</body>
</html>`);
  }
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new AppError("Please provide a valid email", 400);
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If the account exists, a verification email has been sent",
    });
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      status: "success",
      message: "Email already verified",
    });
  }

  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, verificationToken, req);

  return res.status(200).json({
    status: "success",
    message: "Verification email sent",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new AppError("Please provide a valid email", 400);
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If the account exists, a reset email has been sent",
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  await sendResetPasswordEmail(user, resetToken, req);

  return res.status(200).json({
    status: "success",
    message: "Password reset email sent",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  if (!token) {
    throw new AppError("Reset token is required", 400);
  }

  ensureStrongPassword(password);

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new AppError("Reset token is invalid or expired", 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Revoke all existing refresh tokens for this user (force logout everywhere)
  try {
    await revokeAllRefreshTokensForUser(user._id);
  } catch (err) {
    // ignore revoke errors
  }

  await sendAuthResponse(res, 200, user, "Password reset successful");
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }

  ensureStrongPassword(newPassword);

  const user = await User.findById(req.user._id).select("+password");

  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 401);
  }

  user.password = newPassword;

  // Revoke all existing refresh tokens for this user (force logout everywhere)
  try {
    await revokeAllRefreshTokensForUser(user._id);
  } catch (err) {
    // ignore revoke errors
  }

  await sendAuthResponse(res, 200, user, "Password changed successfully");
});

const refreshToken = asyncHandler(async (req, res) => {
  const existingToken = getCookie(req, "refreshToken");

  if (!existingToken) {
    throw new AppError("Refresh token is required", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(existingToken, env.jwtRefreshSecret);
  } catch (error) {
    throw new AppError("Invalid refresh token", 401);
  }

  const storedUserId = await getRefreshTokenUserId(existingToken);
  if (!storedUserId || storedUserId !== String(decoded.id)) {
    throw new AppError("Invalid refresh token", 401);
  }

  const user = await User.findById(decoded.id);
  await deleteRefreshToken(existingToken);

  if (!user) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Email not verified", 403);
  }

  await sendAuthResponse(res, 200, user, "Token refreshed successfully");
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
        avatar: req.user.avatar,
        phone: req.user.phone,
        birthDate: req.user.birthDate,
        gender: req.user.gender,
        address: req.user.address,
        bio: req.user.bio,
        subscriptionTier: req.user.subscriptionTier,
        subscriptionExpiry: req.user.subscriptionExpiry,
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
  const existingToken = getCookie(req, "refreshToken");

  if (existingToken) {
    try {
      await deleteRefreshToken(existingToken);
    } catch (error) {
      // Ignore invalid token during logout
    }
  }

  clearAuthCookies(res);

  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

const googleOAuthClient = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret
);

const findOrCreateGoogleUser = async (payload) => {
  const email = normalizeEmail(payload.email);
  const googleId = payload.sub;
  const name = payload.name || email.split("@")[0];

  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
  } else {
    user = await User.create({
      name,
      email,
      googleId,
      isEmailVerified: true,
    });
  }

  await user.save({ validateBeforeSave: false });
  return user;
};

const googleLogin = asyncHandler(async (req, res) => { 
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError("Google ID token is required", 400);
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw new AppError("Invalid Google ID token", 401);
  }

  if (!payload || !payload.email) {
    throw new AppError("Unable to retrieve email from Google", 400);
  }

  const user = await findOrCreateGoogleUser(payload);

  await sendAuthResponse(res, 200, user, "Google login successful");
});

// ─── Mobile Google OAuth callback ─────────────────────────────
// Flow: Mobile → Google OAuth → redirect về backend → backend xử lý
// → redirect về app với mobileToken → app gọi finalize để lấy user

const mobileTokenSecret = env.jwtSecret + "-mobile-google";
const mobileTokenExpiresIn = "2m";

const googleMobileCallback = asyncHandler(async (req, res) => {
  const { code, state: appReturnUrl } = req.query;

  // Build backend origin from env or request (handles proxies correctly)
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  const backendOrigin =
    (env.backendUrl || `${proto}://${host}`).replace(/\/+$/, "");

  // App return URL: mobile gửi qua state, fallback về custom scheme
  let appBase = appReturnUrl || "suviet360://login";

  // Ngăn chặn lỗ hổng Open Redirect bằng cách kiểm duyệt Scheme di động (cho phép suviet360:// và exp:// cho development)
  if (!appBase.startsWith("suviet360://") && !appBase.startsWith("exp://")) {
    appBase = "suviet360://login";
  }

  const buildAppUrl = (params) => {
    const sep = appBase.includes("?") ? "&" : "?";
    return `${appBase}${sep}${params}`;
  };

  if (!code) {
    return res.redirect(buildAppUrl(`error=${encodeURIComponent("Thiếu mã xác thực")}`));
  }

  try {
    // Đổi authorization code → tokens
    const { tokens } = await googleOAuthClient.getToken({
      code,
      redirect_uri: `${backendOrigin}/api/auth/google/callback`,
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return res.redirect(buildAppUrl(`error=${encodeURIComponent("Không nhận được id_token")}`));
    }

    // Verify idToken
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.redirect(buildAppUrl(`error=${encodeURIComponent("Không lấy được email")}`));
    }

    const user = await findOrCreateGoogleUser(payload);

    // Tạo mobileToken ngắn hạn (2 phút) để app gọi finalize
    const mobileToken = jwt.sign(
      { userId: user._id.toString() },
      mobileTokenSecret,
      { expiresIn: mobileTokenExpiresIn },
    );

    res.redirect(buildAppUrl(`mt=${mobileToken}`));
  } catch (error) {
    console.error("[Google Mobile Callback Error]", error);
    res.redirect(buildAppUrl(`error=${encodeURIComponent("Đăng nhập Google thất bại")}`));
  }
});

// App gọi endpoint này với mobileToken để hoàn tất đăng nhập
const googleMobileFinalize = asyncHandler(async (req, res) => {
  const { mobileToken } = req.body;

  if (!mobileToken) {
    throw new AppError("Mobile token is required", 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(mobileToken, mobileTokenSecret);
  } catch {
    throw new AppError("Invalid or expired mobile token", 401);
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await sendAuthResponse(res, 200, user, "Google login successful");
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.status(200).json({
    status: "success",
    data: users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar || "",
      isLocked: u.isLocked || false,
    })),
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["admin", "student", "staff", "teacher"].includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  if (req.user._id.toString() === id && role !== "admin") {
    throw new AppError("You cannot remove your own admin role", 450); // custom or standard bad request
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    status: "success",
    message: "User role updated successfully",
    data: {
      id: user._id.toString(),
      role: user.role,
    },
  });
});

const toggleUserLock = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user._id.toString() === id) {
    throw new AppError("You cannot lock your own account", 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.isLocked = !user.isLocked;
  await user.save();

  res.status(200).json({
    status: "success",
    message: user.isLocked ? "User locked successfully" : "User unlocked successfully",
    data: {
      id: user._id.toString(),
      isLocked: user.isLocked,
    },
  });
});

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  me,
  logout,
  adminOnly,
  googleLogin,
  googleMobileCallback,
  googleMobileFinalize,
  getAllUsers,
  updateUserRole,
  toggleUserLock,
};
