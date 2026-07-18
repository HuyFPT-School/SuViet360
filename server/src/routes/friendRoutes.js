const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  getFriendSuggestions,
  getSentFriendRequests,
} = require("../controllers/friendController");

// All routes require authentication
router.use(protect);

router.get("/", getFriends);
router.get("/requests", getFriendRequests);
router.get("/sent-requests", getSentFriendRequests);
router.get("/suggestions", getFriendSuggestions);
router.post("/request/:userId", sendFriendRequest);
router.put("/accept/:friendshipId", acceptFriendRequest);
router.put("/reject/:friendshipId", rejectFriendRequest);
router.delete("/:friendshipId", removeFriend);

module.exports = router;
