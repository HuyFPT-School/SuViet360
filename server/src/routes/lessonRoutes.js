const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { uploadLessonFiles } = require("../config/cloudinary");
const {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
} = require("../controllers/lessonController");

const router = express.Router();

// Public: get all lessons & get single lesson
router.get("/", getAllLessons);
router.get("/:id", getLessonById);

// Admin only: create, update, delete
router.use(protect, authorize("admin"));

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
