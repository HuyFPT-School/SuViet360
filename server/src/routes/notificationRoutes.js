const express = require("express");
const { protect } = require("../middleware/auth");
const {
  followCategory,
  unfollowCategory,
  getFollowedCategories,
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

// Require authentication for all routes in this router
router.use(protect);

router.post("/follow", followCategory);
router.post("/unfollow", unfollowCategory);
router.get("/followed", getFollowedCategories);
router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;
