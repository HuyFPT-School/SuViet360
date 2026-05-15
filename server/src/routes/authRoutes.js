const express = require("express");
const {
  register,
  login,
  me,
  logout,
  adminOnly,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.get("/admin", protect, authorize("admin"), adminOnly);

module.exports = router;
