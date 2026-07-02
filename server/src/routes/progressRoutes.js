const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getDashboard,
  completeLesson,
  completePodcast,
  submitQuiz,
  getLeaderboard,
} = require("../controllers/progressController");

const router = express.Router();

// Public leaderboard access
router.get("/leaderboard", getLeaderboard);

// All other endpoints require authentication
router.use(protect);

router.get("/dashboard", getDashboard);
router.post("/lesson/:id/complete", completeLesson);
router.post("/podcast/:id/complete", completePodcast);
router.post("/quiz/:id/submit", submitQuiz);

module.exports = router;
