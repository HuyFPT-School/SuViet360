const express = require("express");
const { protect } = require("../middleware/auth");
const { uploadAvatar } = require("../config/cloudinary");
const {
  updateProfile,
  uploadAvatarHandler,
  deleteAvatar,
} = require("../controllers/profileController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// PATCH /api/user/profile - Update personal info
router.patch("/profile", updateProfile);

// POST /api/user/avatar - Upload avatar image
router.post("/avatar", uploadAvatar.single("avatar"), uploadAvatarHandler);

// DELETE /api/user/avatar - Remove avatar
router.delete("/avatar", deleteAvatar);

module.exports = router;
