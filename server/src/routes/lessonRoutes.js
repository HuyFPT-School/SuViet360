const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { uploadLessonFiles, cloudinary } = require("../config/cloudinary");
const {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  approveLesson,
  rejectLesson,
  getChapters,
  getChaptersWithLessons,
} = require("../controllers/lessonController");

const router = express.Router();

// Public: get all lessons & get single lesson
router.get("/", getAllLessons);

// Public: chapters listing (must be before /:id)
router.get("/chapters/list", getChapters);
router.get("/chapters/with-lessons", getChaptersWithLessons);

router.get("/:id", getLessonById);

// Public: get lesson parts (for student reading)
const LessonPart = require("../models/LessonPart");
router.get("/:lessonId/parts", async (req, res) => {
  try {
    const parts = await LessonPart.find({ lessonId: req.params.lessonId })
      .sort({ order: 1 })
      .lean();
    res.set("Cache-Control", "public, max-age=3600").status(200).json({ success: true, parts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Teacher/Admin review routes
router.put("/:id/approve", protect, authorize("admin", "teacher"), approveLesson);
router.put("/:id/reject", protect, authorize("admin", "teacher"), rejectLesson);

// Admin only: create, update, delete
router.use(protect, authorize("admin", "staff"));

// Chapter CRUD for staff
const Chapter = require("../models/Chapter");
router.post("/chapters", async (req, res) => {
  try {
    const chapter = await Chapter.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, chapter });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
router.put("/chapters/:chapterId", async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndUpdate(req.params.chapterId, req.body, { new: true, runValidators: true });
    if (!chapter) return res.status(404).json({ success: false, message: "Chapter not found" });
    res.status(200).json({ success: true, chapter });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
router.delete("/chapters/:chapterId", async (req, res) => {
  try {
    // Cascade: delete lessons under this chapter
    const Lesson = require("../models/Lesson");
    await Lesson.deleteMany({ chapterId: req.params.chapterId });
    await Chapter.findByIdAndDelete(req.params.chapterId);
    res.status(200).json({ success: true, message: "Chapter and its lessons deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── LessonPart CRUD for staff ──────────────────────────────────
// (public GET /:lessonId/parts is above)

/** Upload a file buffer to Cloudinary, returns { secure_url, public_id } */
const uploadToCloudinary = (file, folder = "suviet360/lesson-parts") => {
  return new Promise((resolve, reject) => {
    const isAudio = file.mimetype.startsWith("audio/");
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: isAudio ? "video" : "image", folder },
      (err, result) => {
        if (err) return reject(err);
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
};

// POST create a new LessonPart
router.post(
  "/:lessonId/parts",
  uploadLessonFiles.fields([{ name: "images", maxCount: 20 }, { name: "audios", maxCount: 10 }]),
  async (req, res) => {
    try {
      const { title, learningObjective, estimatedMinutes, order, contentBlocks, podcastId } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: "Part title is required" });
      }

      let parsedBlocks = [];
      if (contentBlocks) {
        try {
          parsedBlocks = typeof contentBlocks === "string" ? JSON.parse(contentBlocks) : contentBlocks;
        } catch { return res.status(400).json({ success: false, message: "Invalid contentBlocks JSON" }); }
      }

      // Process uploaded images → Cloudinary
      const uploadedImages = req.files?.images || [];
      let imgIdx = 0;
      for (let i = 0; i < parsedBlocks.length; i++) {
        if (parsedBlocks[i].type === "image" && imgIdx < uploadedImages.length) {
          const upload = await uploadToCloudinary(uploadedImages[imgIdx], "suviet360/lesson-parts/images");
          parsedBlocks[i].data = {
            ...parsedBlocks[i].data,
            imageUrl: upload.secure_url,
            publicId: upload.public_id,
          };
          imgIdx++;
        }
      }

      // Process uploaded audios → Cloudinary
      const uploadedAudios = req.files?.audios || [];
      let audIdx = 0;
      for (let i = 0; i < parsedBlocks.length; i++) {
        if (parsedBlocks[i].type === "audio" && audIdx < uploadedAudios.length) {
          const upload = await uploadToCloudinary(uploadedAudios[audIdx], "suviet360/lesson-parts/audios");
          parsedBlocks[i].data = {
            ...parsedBlocks[i].data,
            audioUrl: upload.secure_url,
            publicId: upload.public_id,
          };
          audIdx++;
        }
      }

      const partData = {
        title,
        lessonId: req.params.lessonId,
        order: order !== undefined ? parseInt(order, 10) : 0,
        learningObjective: learningObjective || "",
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : 5,
        contentBlocks: parsedBlocks,
        status: "Draft",
      };
      if (podcastId) partData.podcastId = podcastId;

      const part = await LessonPart.create(partData);
      res.status(201).json({ success: true, part });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// PUT update a LessonPart
router.put(
  "/parts/:partId",
  uploadLessonFiles.fields([{ name: "images", maxCount: 20 }, { name: "audios", maxCount: 10 }]),
  async (req, res) => {
    try {
      const { title, learningObjective, estimatedMinutes, order, contentBlocks, podcastId } = req.body;

      const updates = {};
      if (title) updates.title = title;
      if (learningObjective !== undefined) updates.learningObjective = learningObjective;
      if (estimatedMinutes !== undefined) updates.estimatedMinutes = parseInt(estimatedMinutes, 10);
      if (order !== undefined) updates.order = parseInt(order, 10);
      if (podcastId !== undefined) updates.podcastId = podcastId || null;

      if (contentBlocks) {
        let parsedBlocks;
        try {
          parsedBlocks = typeof contentBlocks === "string" ? JSON.parse(contentBlocks) : contentBlocks;
        } catch { return res.status(400).json({ success: false, message: "Invalid contentBlocks JSON" }); }

        const uploadedImages = req.files?.images || [];
        let imgIdx = 0;
        for (let i = 0; i < parsedBlocks.length; i++) {
          if (parsedBlocks[i].type === "image") {
            if (imgIdx < uploadedImages.length) {
              const upload = await uploadToCloudinary(uploadedImages[imgIdx], "suviet360/lesson-parts/images");
              parsedBlocks[i].data = {
                ...parsedBlocks[i].data,
                imageUrl: upload.secure_url,
                publicId: upload.public_id,
              };
              imgIdx++;
            }
          }
        }

        const uploadedAudios = req.files?.audios || [];
        let audIdx = 0;
        for (let i = 0; i < parsedBlocks.length; i++) {
          if (parsedBlocks[i].type === "audio") {
            if (audIdx < uploadedAudios.length) {
              const upload = await uploadToCloudinary(uploadedAudios[audIdx], "suviet360/lesson-parts/audios");
              parsedBlocks[i].data = {
                ...parsedBlocks[i].data,
                audioUrl: upload.secure_url,
                publicId: upload.public_id,
              };
              audIdx++;
            }
          }
        }
        updates.contentBlocks = parsedBlocks;
      }

      const part = await LessonPart.findByIdAndUpdate(req.params.partId, updates, {
        new: true, runValidators: true,
      });

      if (!part) return res.status(404).json({ success: false, message: "Part not found" });
      res.status(200).json({ success: true, part });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// DELETE a LessonPart
router.delete("/parts/:partId", async (req, res) => {
  try {
    const part = await LessonPart.findByIdAndDelete(req.params.partId);
    if (!part) return res.status(404).json({ success: false, message: "Part not found" });
    res.status(200).json({ success: true, message: "Part deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

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
