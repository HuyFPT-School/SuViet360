const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middleware/auth");
const {
  createPodcast,
  updatePodcast,
  deletePodcast,
  getStaffPodcasts,
  getStaffPodcastById,
  uploadImageOnly,
  uploadAudioOnly,
  getAllPodcasts,
  getPodcastById,
  getNotes,
  createNote,
  deleteNote,
  updateNote,
  getComments,
  createComment,
  deleteComment,
  updateComment,
  approvePodcast,
  rejectPodcast,
} = require("../controllers/podcastController");

const router = express.Router();

// Configure multer for memory storage file parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max size for uploads (audio files can be large)
  },
});

// ─── Public User Routes ──────────────────────────────────────────────
router.get("/podcasts", getAllPodcasts);
router.get("/podcasts/review", protect, authorize("admin", "teacher"), getStaffPodcasts);
router.get("/podcasts/:id", getPodcastById);
router.get("/podcast-comments/:podcastId", getComments);

// ─── Authenticated User Routes ───────────────────────────────────────
router.use(protect);

// Teacher/Admin review routes
router.put("/podcasts/:id/approve", authorize("admin", "teacher"), approvePodcast);
router.put("/podcasts/:id/reject", authorize("admin", "teacher"), rejectPodcast);

// Notes (User specific)
router.get("/podcast-notes/:podcastId", getNotes);
router.post("/podcast-notes", createNote);
router.put("/podcast-notes/:id", updateNote);
router.delete("/podcast-notes/:id", deleteNote);

// Comments
router.post("/podcast-comments", createComment);
router.put("/podcast-comments/:id", updateComment);
router.delete("/podcast-comments/:id", deleteComment);

// ─── Staff Only Management Routes ────────────────────────────────────
router.use(authorize("staff"));

// Direct Cloudinary uploads
router.post("/upload/image", upload.single("image"), uploadImageOnly);
router.post("/upload/audio", upload.single("audio"), uploadAudioOnly);

// Podcast CRUD
router.get("/staff/podcasts", getStaffPodcasts);
router.get("/staff/podcasts/:id", getStaffPodcastById);

router.post(
  "/staff/podcasts",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  createPodcast
);

router.put(
  "/staff/podcasts/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  updatePodcast
);

router.delete("/staff/podcasts/:id", deletePodcast);

module.exports = router;
