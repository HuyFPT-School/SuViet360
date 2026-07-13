const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { uploadLessonFiles } = require("../config/cloudinary");
const {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  approveLesson,
  rejectLesson,
} = require("../controllers/lessonController");

const router = express.Router();

// Public: get all lessons & get single lesson
router.get("/", getAllLessons);
// Staff: get all lessons (protected → req.user is set → showAll=true)
router.get("/staff", protect, authorize("admin", "staff"), getAllLessons);
// Teacher/Admin: review all lessons
router.get("/review", protect, authorize("admin", "teacher"), getAllLessons);
router.get("/:id", getLessonById);

// Teacher/Admin review routes
router.put("/:id/approve", protect, authorize("admin", "teacher"), approveLesson);
router.put("/:id/reject", protect, authorize("admin", "teacher"), rejectLesson);

// Admin only: create, update, delete
router.use(protect, authorize("admin", "staff"));

router.post(
  "/",
  uploadLessonFiles.fields([
    { name: "tilemapJson", maxCount: 1 },
    { name: "tilesets", maxCount: 20 },
    { name: "idleSprites", maxCount: 30 },
    { name: "runSprites", maxCount: 30 },
  ]),
  createLesson
);

router.put(
  "/:id",
  uploadLessonFiles.fields([
    { name: "tilemapJson", maxCount: 1 },
    { name: "tilesets", maxCount: 20 },
    { name: "idleSprites", maxCount: 30 },
    { name: "runSprites", maxCount: 30 },
  ]),
  updateLesson
);

router.delete("/:id", deleteLesson);

module.exports = router;
