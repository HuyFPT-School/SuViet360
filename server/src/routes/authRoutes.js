const express = require("express");
const {
  register,
  login,
  googleLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  me,
  logout,
  adminOnly,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);
router.get("/admin", protect, authorize("admin"), adminOnly);

module.exports = router;
