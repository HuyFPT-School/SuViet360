/**
 * Curriculum Routes — /api/curriculum/*
 *
 * Mô hình lazy-load:
 *   GET /chapters?grade=12         → danh sách chương (nhẹ)
 *   GET /chapters/:id              → chi tiết chương
 *   GET /chapters/:id/lessons      → danh sách bài (nhẹ)
 *   GET /lessons/:id               → chi tiết bài
 *   GET /lessons/:id/parts         → danh sách part (nhẹ)
 *   GET /parts/:id/blocks          → nội dung part (lazy)
 *   GET /games/:id                 → config game (lazy, nặng)
 *   GET /quizzes/:id               → câu hỏi quiz (lazy, nặng)
 *
 * Authenticated:
 *   GET    /progress/:lessonId           → tiến độ
 *   POST   /progress/:lessonId/complete-part
 *   POST   /progress/:lessonId/quiz-result
 *   POST   /progress/:lessonId/game-result
 *   PUT    /progress/:lessonId
 *
 * Admin:
 *   POST   /chapters
 *   PUT    /chapters/:id
 *   DELETE /chapters/:id
 */

const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getChapters,
  getChapterDetail,
  getLessons,
  getLessonDetail,
  getParts,
  getPartBlocks,
  getGame,
  getQuiz,
  getProgress,
  completePart,
  submitQuizResult,
  submitGameResult,
  updateProgress,
  createChapter,
  updateChapter,
  deleteChapter,
} = require("../controllers/curriculumController");

const router = express.Router();

// ─── Public: Chapters ──────────────────────────────────────────
router.get("/chapters", getChapters);
router.get("/chapters/:id", getChapterDetail);

// ─── Public: Lessons ───────────────────────────────────────────
router.get("/chapters/:chapterId/lessons", getLessons);
router.get("/lessons/:id", getLessonDetail);

// ─── Public: LessonParts ───────────────────────────────────────
router.get("/lessons/:lessonId/parts", getParts);
router.get("/parts/:partId/blocks", getPartBlocks);

// ─── Public: Game & Quiz (lazy-load) ───────────────────────────
router.get("/games", async (_req, res) => {
  try {
    const Game = require("../models/Game");
    const games = await Game.find({ status: "Published" }).select("title gameType thumbnail status").sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, games });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});
router.get("/games/:id", getGame);
router.get("/quizzes/:id", getQuiz);

// ─── Authenticated: Progress ───────────────────────────────────
router.use("/progress", protect);
router.get("/progress/:lessonId", getProgress);
router.put("/progress/:lessonId", updateProgress);
router.post("/progress/:lessonId/complete-part", completePart);
router.post("/progress/:lessonId/quiz-result", submitQuizResult);
router.post("/progress/:lessonId/game-result", submitGameResult);

// ─── Admin: CRUD ───────────────────────────────────────────────
router.use(protect, authorize("admin", "staff"));
router.post("/chapters", createChapter);
router.put("/chapters/:id", updateChapter);
router.delete("/chapters/:id", deleteChapter);

module.exports = router;
