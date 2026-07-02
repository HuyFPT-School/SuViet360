/**
 * Curriculum Controller — Xử lý HTTP cho hệ thống học tập.
 *
 * Mô hình lazy-load:
 *   1. GET chapters   → chỉ metadata (nhẹ, ~2KB)
 *   2. GET lessons    → chỉ metadata
 *   3. GET parts      → chỉ title + order
 *   4. GET part/blocks → content (text, image, audio...)
 *   5. GET games/:id  → config game (nặng, chỉ khi cần)
 *   6. GET quizzes/:id → câu hỏi (nặng, chỉ khi cần)
 */

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const curriculumService = require("../services/curriculumService");

// ══════════════════════════════════════════════════════════════════
// Public: Chapters
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/curriculum/chapters?grade=12
 * Trả danh sách chương theo khối lớp (siêu nhẹ).
 */
const getChapters = asyncHandler(async (req, res) => {
  const grade = parseInt(req.query.grade, 10);
  if (![10, 11, 12].includes(grade)) {
    throw new AppError("grade must be 10, 11, or 12", 400);
  }

  const result = await curriculumService.getChaptersByGrade(grade, {
    status: "Published",
  });

  res.set("Cache-Control", "public, max-age=3600").status(200).json(result);
});

/**
 * GET /api/curriculum/chapters/:id
 */
const getChapterDetail = asyncHandler(async (req, res) => {
  const result = await curriculumService.getChapterById(req.params.id);
  res.set("Cache-Control", "public, max-age=3600").status(200).json(result);
});

// ══════════════════════════════════════════════════════════════════
// Public: Lessons
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/curriculum/chapters/:chapterId/lessons
 * Trả danh sách bài học trong chương (metadata nhẹ).
 */
const getLessons = asyncHandler(async (req, res) => {
  const result = await curriculumService.getLessonsByChapter(req.params.chapterId, {
    status: "Published",
  });
  res.set("Cache-Control", "public, max-age=3600").status(200).json(result);
});

/**
 * GET /api/curriculum/lessons/:id
 */
const getLessonDetail = asyncHandler(async (req, res) => {
  const result = await curriculumService.getLessonById(req.params.id);
  res.set("Cache-Control", "public, max-age=3600").status(200).json(result);
});

// ══════════════════════════════════════════════════════════════════
// Public: LessonParts
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/curriculum/lessons/:lessonId/parts
 * Trả danh sách part (title, order, objective) — chưa có content.
 */
const getParts = asyncHandler(async (req, res) => {
  const result = await curriculumService.getPartsByLesson(req.params.lessonId, {
    status: "Published",
  });
  res.set("Cache-Control", "public, max-age=3600").status(200).json(result);
});

/**
 * GET /api/curriculum/parts/:partId/blocks
 * Trả contentBlocks của 1 part (text, image, audio, game/quiz ref...).
 * Đây là API chính để load nội dung học.
 */
const getPartBlocks = asyncHandler(async (req, res) => {
  const result = await curriculumService.getPartBlocks(req.params.partId);
  res.set("Cache-Control", "public, max-age=1800").status(200).json(result);
});

// ══════════════════════════════════════════════════════════════════
// Public: Game & Quiz (lazy-load)
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/curriculum/games/:id
 * Trả config game Phaser (nặng). Chỉ gọi khi user scroll đến game.
 */
const getGame = asyncHandler(async (req, res) => {
  const result = await curriculumService.getGameById(req.params.id);
  res.set("Cache-Control", "public, max-age=1800").status(200).json(result);
});

/**
 * GET /api/curriculum/quizzes/:id
 * Trả bộ câu hỏi quiz. Student không thấy đáp án, admin/teacher thấy đầy đủ.
 */
const getQuiz = asyncHandler(async (req, res) => {
  const isAdmin = req.user && ["admin", "staff", "teacher"].includes(req.user.role);
  const result = await curriculumService.getQuizById(req.params.id, isAdmin);
  res.set("Cache-Control", "public, max-age=1800").status(200).json(result);
});

// ══════════════════════════════════════════════════════════════════
// Authenticated: UserProgress
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/curriculum/progress/:lessonId
 * Lấy tiến độ của user cho 1 bài học.
 */
const getProgress = asyncHandler(async (req, res) => {
  const result = await curriculumService.getProgress(req.user.id, req.params.lessonId);
  res.status(200).json(result);
});

/**
 * POST /api/curriculum/progress/:lessonId/complete-part
 * Body: { partId }
 */
const completePart = asyncHandler(async (req, res) => {
  const { partId } = req.body;
  if (!partId) throw new AppError("partId is required", 400);

  const result = await curriculumService.completePart(req.user.id, req.params.lessonId, partId);
  res.status(200).json(result);
});

/**
 * POST /api/curriculum/progress/:lessonId/quiz-result
 * Body: { quizId, answers: [{ questionIndex, selectedIndex }] }
 */
const submitQuizResult = asyncHandler(async (req, res) => {
  const { quizId, answers } = req.body;
  if (!quizId || !answers) throw new AppError("quizId and answers are required", 400);

  const result = await curriculumService.submitQuizResult(
    req.user.id,
    req.params.lessonId,
    quizId,
    { answers }
  );
  res.status(200).json(result);
});

/**
 * POST /api/curriculum/progress/:lessonId/game-result
 * Body: { gameId, score, metadata }
 */
const submitGameResult = asyncHandler(async (req, res) => {
  const { gameId, score, metadata } = req.body;
  if (!gameId) throw new AppError("gameId is required", 400);

  const result = await curriculumService.submitGameResult(
    req.user.id,
    req.params.lessonId,
    gameId,
    { score, metadata }
  );
  res.status(200).json(result);
});

/**
 * PUT /api/curriculum/progress/:lessonId
 * Cập nhật lastPosition hoặc totalTimeSpent.
 */
const updateProgress = asyncHandler(async (req, res) => {
  const { lastPosition, totalTimeSpent } = req.body;
  const updateData = {};
  if (lastPosition) updateData.lastPosition = lastPosition;
  if (totalTimeSpent !== undefined) updateData.totalTimeSpent = totalTimeSpent;

  const result = await curriculumService.updateProgress(
    req.user.id,
    req.params.lessonId,
    updateData
  );
  res.status(200).json(result);
});

// ══════════════════════════════════════════════════════════════════
// Admin: CRUD Chapters & Lessons
// ══════════════════════════════════════════════════════════════════

const createChapter = asyncHandler(async (req, res) => {
  const data = { ...req.body, createdBy: req.user.id };
  const result = await curriculumService.createChapter(data);
  res.status(201).json(result);
});

const updateChapter = asyncHandler(async (req, res) => {
  const result = await curriculumService.updateChapter(req.params.id, req.body);
  res.status(200).json(result);
});

const deleteChapter = asyncHandler(async (req, res) => {
  const result = await curriculumService.deleteChapter(req.params.id);
  res.status(200).json(result);
});

module.exports = {
  // Public
  getChapters,
  getChapterDetail,
  getLessons,
  getLessonDetail,
  getParts,
  getPartBlocks,
  getGame,
  getQuiz,
  // Authenticated
  getProgress,
  completePart,
  submitQuizResult,
  submitGameResult,
  updateProgress,
  // Admin
  createChapter,
  updateChapter,
  deleteChapter,
};
