const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createGroup,
  getPublicGroups,
  getMyGroups,
  getGroupById,
  updateGroup,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  moderateGroupPost,
} = require("../controllers/groupController");

// Public
router.get("/", getPublicGroups);

// Protected
router.use(protect);

router.post("/", createGroup);
router.get("/my", getMyGroups);
router.get("/:id", getGroupById);
router.put("/:id", updateGroup);
router.post("/:id/join", joinGroup);
router.post("/:id/leave", leaveGroup);
router.get("/:id/posts", getGroupPosts);
router.put("/:id/posts/:postId/moderate", moderateGroupPost);

module.exports = router;
