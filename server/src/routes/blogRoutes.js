const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middleware/auth");
const {
  createPost,
  getPublishedPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost,
  getPendingPosts,
  approvePost,
  rejectPost,
  removePost,
} = require("../controllers/blogController");
const {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  hideComment,
} = require("../controllers/blogCommentController");
const { toggleLike, getLikeStatus } = require("../controllers/blogLikeController");
const {
  createReport,
  getPendingReports,
  resolveReport,
} = require("../controllers/blogReportController");

const router = express.Router();

// Multer memory storage configuration for images (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ─── Public Routes ──────────────────────────────────────────────────
router.get("/posts", getPublishedPosts);
router.get("/posts/my", protect, getMyPosts); // Placed before :id to prevent hijacking
router.get("/posts/:id", getPostById);
router.get("/posts/:postId/comments", getCommentsByPost);

// ─── Protected Routes (Requires Login) ──────────────────────────────
router.use(protect);

router.post("/posts", upload.array("images", 3), createPost);

router.put("/posts/:id", upload.array("images", 3), updatePost);
router.delete("/posts/:id", deletePost);

router.post("/posts/:postId/comments", createComment);
router.put("/comments/:id", updateComment);
router.delete("/comments/:id", deleteComment);

router.post("/like", toggleLike);
router.get("/like/:targetType/:targetId", getLikeStatus);

router.post("/reports", createReport);

// ─── Staff/Admin Moderation Routes ──────────────────────────────────
router.use(authorize("staff", "admin"));

router.get("/moderation/posts", getPendingPosts);
router.put("/moderation/posts/:id/approve", approvePost);
router.put("/moderation/posts/:id/reject", rejectPost);
router.delete("/moderation/posts/:id", removePost);

router.put("/comments/:id/hide", hideComment);

router.get("/reports", getPendingReports);
router.put("/reports/:id/resolve", resolveReport);

module.exports = router;
