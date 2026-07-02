/**
 * Curriculum Service — Business logic cho toàn bộ hệ thống học tập.
 * Chapter → CurriculumLesson → LessonPart → Game | Quiz | UserProgress
 *
 * Mỗi hàm trả về dữ liệu đã format sẵn cho API response.
 * Controller chỉ lo HTTP (req/res), service lo business logic + cache.
 */

const Chapter = require("../models/Chapter");
const CurriculumLesson = require("../models/CurriculumLesson");
const LessonPart = require("../models/LessonPart");
const Game = require("../models/Game");
const Quiz = require("../models/Quiz");
const UserProgress = require("../models/UserProgress");
const AppError = require("../utils/AppError");
const {
  getCachePayload,
  setCachePayload,
  deleteCache,
  deleteCacheByPattern,
  LIST_TTL,
  DETAIL_TTL,
} = require("../utils/cache");

// ══════════════════════════════════════════════════════════════════
// Cache Key Helpers
// ══════════════════════════════════════════════════════════════════

const cacheKeys = {
  chaptersByGrade: (grade) => `curriculum:chapters:grade:${grade}`,
  chapterDetail: (id) => `curriculum:chapter:${id}`,
  chapterLessons: (chapterId) => `curriculum:chapter:${chapterId}:lessons`,
  lessonDetail: (id) => `curriculum:lesson:${id}`,
  lessonParts: (lessonId) => `curriculum:lesson:${lessonId}:parts`,
  partBlocks: (partId) => `curriculum:part:${partId}:blocks`,
  game: (id) => `curriculum:game:${id}`,
  quiz: (id) => `curriculum:quiz:${id}`,
  userProgress: (userId, lessonId) => `curriculum:progress:${userId}:${lessonId}`,
};

// ══════════════════════════════════════════════════════════════════
// Invalidation helpers
// ══════════════════════════════════════════════════════════════════

const invalidateCurriculumCache = async (grade = null) => {
  if (grade) {
    await deleteCache(cacheKeys.chaptersByGrade(grade));
  } else {
    await deleteCacheByPattern("curriculum:chapters*");
  }
};

// ══════════════════════════════════════════════════════════════════
// Chapter
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách chương theo khối lớp (chỉ metadata nhẹ).
 * @param {number} grade - 10 | 11 | 12
 * @param {object} options - { fields, status }
 */
const getChaptersByGrade = async (grade, options = {}) => {
  const filter = { grade };
  if (options.status) filter.status = options.status;

  // Lấy từ cache
  const cacheKey = cacheKeys.chaptersByGrade(grade);
  if (options.status === "Published") {
    const cached = await getCachePayload(cacheKey);
    if (cached) return JSON.parse(cached.body);
  }

  const select = options.fields || "title description order coverImage status";

  const chapters = await Chapter.find(filter)
    .select(select)
    .sort({ order: 1 })
    .lean();

  // Thêm lessonCount nếu không bị loại trừ
  if (!options.fields || options.fields.includes("lessonCount")) {
    const counts = await CurriculumLesson.aggregate([
      { $match: { chapterId: { $in: chapters.map((c) => c._id) } } },
      { $group: { _id: "$chapterId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
    chapters.forEach((ch) => {
      ch.lessonCount = countMap[ch._id.toString()] || 0;
    });
  }

  const result = { success: true, grade, count: chapters.length, chapters };

  if (options.status === "Published") {
    setCachePayload(cacheKey, result, LIST_TTL);
  }

  return result;
};

/**
 * Lấy chi tiết 1 chương.
 */
const getChapterById = async (id) => {
  const chapter = await Chapter.findById(id).lean();
  if (!chapter) throw new AppError("Chapter not found", 404);

  // Đếm lesson
  const lessonCount = await CurriculumLesson.countDocuments({ chapterId: id });
  chapter.lessonCount = lessonCount;

  return { success: true, chapter };
};

// ══════════════════════════════════════════════════════════════════
// CurriculumLesson
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách bài học trong chương (chỉ metadata nhẹ).
 */
const getLessonsByChapter = async (chapterId, options = {}) => {
  const filter = { chapterId };
  if (options.status) filter.status = options.status;

  const cacheKey = cacheKeys.chapterLessons(chapterId);
  if (options.status === "Published") {
    const cached = await getCachePayload(cacheKey);
    if (cached) return JSON.parse(cached.body);
  }

  const select = options.fields || "title order duration difficulty tags thumbnail status";

  const lessons = await CurriculumLesson.find(filter)
    .select(select)
    .sort({ order: 1 })
    .lean();

  // Thêm partCount
  if (!options.fields || options.fields.includes("partCount")) {
    const counts = await LessonPart.aggregate([
      { $match: { lessonId: { $in: lessons.map((l) => l._id) } } },
      { $group: { _id: "$lessonId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
    lessons.forEach((l) => {
      l.partCount = countMap[l._id.toString()] || 0;
    });
  }

  const result = { success: true, chapterId, count: lessons.length, lessons };

  if (options.status === "Published") {
    setCachePayload(cacheKey, result, LIST_TTL);
  }

  return result;
};

/**
 * Lấy chi tiết 1 bài học (metadata).
 */
const getLessonById = async (id) => {
  const lesson = await CurriculumLesson.findById(id)
    .populate("chapterId", "title grade")
    .lean();

  if (!lesson) throw new AppError("Lesson not found", 404);

  const partCount = await LessonPart.countDocuments({ lessonId: id });
  lesson.partCount = partCount;

  return { success: true, lesson };
};

// ══════════════════════════════════════════════════════════════════
// LessonPart + ContentBlocks
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách LessonPart của 1 bài học (chỉ title, order, objective).
 * KHÔNG bao gồm contentBlocks — lazy-load riêng.
 */
const getPartsByLesson = async (lessonId, options = {}) => {
  const filter = { lessonId };
  if (options.status) filter.status = options.status;

  const cacheKey = cacheKeys.lessonParts(lessonId);
  if (options.status === "Published") {
    const cached = await getCachePayload(cacheKey);
    if (cached) return JSON.parse(cached.body);
  }

  const parts = await LessonPart.find(filter)
    .select("title order learningObjective estimatedMinutes status")
    .sort({ order: 1 })
    .lean();

  const result = { success: true, lessonId, count: parts.length, parts };

  if (options.status === "Published") {
    setCachePayload(cacheKey, result, LIST_TTL);
  }

  return result;
};

/**
 * Lấy toàn bộ contentBlocks của 1 LessonPart.
 * Đây là nơi chứa nội dung thực sự: text, image, audio, timeline, ...
 * Game & Quiz: chỉ trả về reference ({ gameId, quizId, label }), client tự lazy-load.
 */
const getPartBlocks = async (partId) => {
  const cacheKey = cacheKeys.partBlocks(partId);
  const cached = await getCachePayload(cacheKey);
  if (cached) return JSON.parse(cached.body);

  const part = await LessonPart.findById(partId)
    .select("title order learningObjective contentBlocks status")
    .lean();

  if (!part) throw new AppError("Lesson part not found", 404);

  // Không cần populate game/quiz — data đã chứa reference
  const result = { success: true, part };

  setCachePayload(cacheKey, result, DETAIL_TTL);
  return result;
};

// ══════════════════════════════════════════════════════════════════
// Game (lazy-load)
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy config game. Dùng khi user scroll đến game trong LessonPart.
 */
const getGameById = async (id) => {
  const cacheKey = cacheKeys.game(id);
  const cached = await getCachePayload(cacheKey);
  if (cached) return JSON.parse(cached.body);

  const game = await Game.findById(id).lean();
  if (!game || game.status !== "Published") {
    throw new AppError("Game not found", 404);
  }

  const result = { success: true, game };

  setCachePayload(cacheKey, result, DETAIL_TTL);
  return result;
};

// ══════════════════════════════════════════════════════════════════
// Quiz (lazy-load)
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy bộ câu hỏi quiz.
 * Nếu user đã đăng nhập: KHÔNG trả về correctIndex để tránh lộ đáp án.
 * Nếu là admin/teacher: trả về đầy đủ.
 */
const getQuizById = async (id, isAdmin = false) => {
  const cacheKey = cacheKeys.quiz(id);
  const cached = await getCachePayload(cacheKey);
  if (cached) {
    const data = JSON.parse(cached.body);
    if (!isAdmin) {
      // Ẩn đáp án với student
      data.quiz.questions = data.quiz.questions.map((q) => ({
        ...q,
        correctIndex: undefined,
        explanation: undefined,
      }));
    }
    return data;
  }

  const quiz = await Quiz.findById(id).lean();
  if (!quiz || quiz.status !== "Published") {
    throw new AppError("Quiz not found", 404);
  }

  // Cache luôn lưu bản đầy đủ, lúc trả về mới strip theo role
  const fullResult = { success: true, quiz: { ...quiz } };
  setCachePayload(cacheKey, fullResult, DETAIL_TTL);

  if (!isAdmin) {
    quiz.questions = quiz.questions.map((q) => ({
      ...q,
      correctIndex: undefined,
      explanation: undefined,
    }));
  }

  return { success: true, quiz };
};

// ══════════════════════════════════════════════════════════════════
// UserProgress
// ══════════════════════════════════════════════════════════════════

/**
 * Lấy tiến độ của user cho 1 bài học.
 */
const getProgress = async (userId, lessonId) => {
  const progress = await UserProgress.findOne({ userId, lessonId }).lean();
  return { success: true, progress: progress || null };
};

/**
 * Cập nhật tiến độ (upsert).
 */
const updateProgress = async (userId, lessonId, updateData) => {
  const progress = await UserProgress.findOneAndUpdate(
    { userId, lessonId },
    { $set: updateData, $setOnInsert: { userId, lessonId } },
    { upsert: true, new: true, runValidators: true }
  ).lean();

  // Invalidate cache
  await deleteCache(cacheKeys.userProgress(userId, lessonId));

  return { success: true, progress };
};

/**
 * Ghi nhận hoàn thành 1 LessonPart.
 */
const completePart = async (userId, lessonId, partId) => {
  const progress = await UserProgress.findOneAndUpdate(
    { userId, lessonId },
    {
      $addToSet: { completedParts: partId },
      $set: { "lastPosition.partId": partId, "lastPosition.blockIndex": 0 },
      $setOnInsert: { userId, lessonId },
    },
    { upsert: true, new: true }
  ).lean();

  await deleteCache(cacheKeys.userProgress(userId, lessonId));

  return { success: true, progress };
};

/**
 * Ghi nhận kết quả quiz.
 */
const submitQuizResult = async (userId, lessonId, quizId, resultData) => {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw new AppError("Quiz not found", 404);

  // Chấm điểm
  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  let score = 0;
  const answers = resultData.answers.map((ans, idx) => {
    const question = quiz.questions[ans.questionIndex];
    if (!question) return { ...ans, correct: false };
    const correct = ans.selectedIndex === question.correctIndex;
    if (correct) score += question.points || 1;
    return { ...ans, correct };
  });

  const passed = (score / totalPoints) * 100 >= (quiz.passScore || 60);

  const progress = await UserProgress.findOneAndUpdate(
    { userId, lessonId },
    {
      $push: {
        quizResults: {
          quizId,
          score,
          totalPoints,
          passed,
          answers,
          completedAt: new Date(),
        },
      },
      $setOnInsert: { userId, lessonId },
    },
    { upsert: true, new: true }
  ).lean();

  await deleteCache(cacheKeys.userProgress(userId, lessonId));

  return { success: true, score, totalPoints, passed, progress };
};

/**
 * Ghi nhận kết quả game.
 */
const submitGameResult = async (userId, lessonId, gameId, resultData) => {
  const progress = await UserProgress.findOneAndUpdate(
    { userId, lessonId },
    {
      $push: {
        gameResults: {
          gameId,
          score: resultData.score || 0,
          metadata: resultData.metadata || {},
          completedAt: new Date(),
        },
      },
      $setOnInsert: { userId, lessonId },
    },
    { upsert: true, new: true }
  ).lean();

  await deleteCache(cacheKeys.userProgress(userId, lessonId));

  return { success: true, progress };
};

// ══════════════════════════════════════════════════════════════════
// Admin: CRUD
// ══════════════════════════════════════════════════════════════════

const createChapter = async (data) => {
  const chapter = await Chapter.create(data);
  await invalidateCurriculumCache(data.grade);
  return { success: true, chapter };
};

const updateChapter = async (id, data) => {
  const chapter = await Chapter.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!chapter) throw new AppError("Chapter not found", 404);
  await invalidateCurriculumCache(chapter.grade);
  return { success: true, chapter };
};

const deleteChapter = async (id) => {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw new AppError("Chapter not found", 404);

  // Xóa cascade: lessons → parts
  const lessons = await CurriculumLesson.find({ chapterId: id }).select("_id");
  const lessonIds = lessons.map((l) => l._id);
  await LessonPart.deleteMany({ lessonId: { $in: lessonIds } });
  await CurriculumLesson.deleteMany({ chapterId: id });
  await Chapter.findByIdAndDelete(id);

  await invalidateCurriculumCache(chapter.grade);
  return { success: true, message: "Chapter deleted" };
};

module.exports = {
  // Chapter
  getChaptersByGrade,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  // Lesson
  getLessonsByChapter,
  getLessonById,
  // LessonPart
  getPartsByLesson,
  getPartBlocks,
  // Game & Quiz (lazy-load)
  getGameById,
  getQuizById,
  // UserProgress
  getProgress,
  updateProgress,
  completePart,
  submitQuizResult,
  submitGameResult,
  // Cache management
  cacheKeys,
  invalidateCurriculumCache,
};
