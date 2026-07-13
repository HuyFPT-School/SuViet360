const express = require("express");
const {
  register,
  login,
  googleLogin,
  googleMobileCallback,
  googleMobileFinalize,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  me,
  logout,
  adminOnly,
  getAllUsers,
  updateUserRole,
  toggleUserLock,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", googleLogin);
router.get("/google/callback", googleMobileCallback);
router.post("/google/mobile-finalize", googleMobileFinalize);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);
router.get("/admin", protect, authorize("admin"), adminOnly);
router.get("/users", protect, authorize("admin"), getAllUsers);
router.patch("/users/:id/role", protect, authorize("admin"), updateUserRole);
router.patch("/users/:id/toggle-lock", protect, authorize("admin"), toggleUserLock);

module.exports = router;
