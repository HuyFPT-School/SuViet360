const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const lessonService = require("../services/lessonService");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");
const {
  getCachePayload,
  setCachePayload,
  getCacheETag,
  setCacheETag,
  deleteCache,
  deleteCacheByPattern,
  LIST_TTL,
} = require("../utils/cache");

// ─── Cache Keys ──────────────────────────────────────────────────

/**
 * So sánh ETag an toàn (xử lý cả trường hợp có/không dấu "", W/ prefix)
 */
const etagMatch = (clientETag, storedETag) => {
  if (!clientETag) return false;
  const a = clientETag.replace(/^W\//, "").replace(/^"|"$/g, "");
  const b = storedETag.replace(/^"|"$/g, "");
  return a === b;
};

const LESSONS_LIST_KEY = "lessons:list:published";
const LESSONS_LIST_ALL_KEY = "lessons:list:all";
const lessonDetailKey = (id) => `lesson:${id}`;

/**
 * Invalidate tất cả cache liên quan đến Lesson khi có thay đổi.
 */
const invalidateLessonCache = async (lessonId = null) => {
  await deleteCacheByPattern("lessons:list*");
  if (lessonId) {
    await Promise.all([
      deleteCache(lessonDetailKey(lessonId)),
      deleteCache(`${lessonDetailKey(lessonId)}:etag`),
    ]);

    // Tìm và xoá cache của các podcast liên kết với bài học này để tránh hiển thị game cũ/bị reject
    try {
      const Podcast = require("../models/Podcast");
      const linkedPodcasts = await Podcast.find({ lessonId }).select("_id");
      if (linkedPodcasts.length > 0) {
        // Xoá cache list podcast để cập nhật liên kết
        await deleteCacheByPattern("podcasts:list*");
        // Xoá cache detail của các podcast đó
        const deletePromises = [];
        for (const pod of linkedPodcasts) {
          deletePromises.push(deleteCache(`podcast:${pod._id}`));
          deletePromises.push(deleteCache(`podcast:${pod._id}:etag`));
        }
        await Promise.all(deletePromises);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Cache] Failed to invalidate linked podcast cache:", err.message);
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract animation groups from req.files.
 * Multer field names like "idleSprites", "runSprites" → animation name "idle", "run".
 */
const extractAnimationGroups = (files) => {
  const groups = {};
  if (!files) return groups;

  for (const [fieldName, fileArray] of Object.entries(files)) {
    if (fieldName.endsWith("Sprites") && fieldName !== "tilesets") {
      const animName = fieldName.replace(/Sprites$/, "");
      if (fileArray && fileArray.length > 0) {
        groups[animName] = fileArray;
      }
    }
  }

  return groups;
};

// ─── POST /api/lessons ────────────────────────────────────────────────
const createLesson = asyncHandler(async (req, res) => {
  const { title, content, spawnPoint, tilesetNames, chapterId, grade, order } = req.body;

  if (!title || !content) {
    throw new AppError("Title and content are required", 400);
  }

  const spawnX =
    spawnPoint?.x !== undefined ? Number(spawnPoint.x) : NaN;
  const spawnY =
    spawnPoint?.y !== undefined ? Number(spawnPoint.y) : NaN;

  if (isNaN(spawnX) || isNaN(spawnY)) {
    throw new AppError("Valid spawnPoint.x and spawnPoint.y are required", 400);
  }

  // Parse tileset names (sent as JSON array string in form field)
  let parsedTilesetNames;
  try {
    parsedTilesetNames =
      typeof tilesetNames === "string"
        ? JSON.parse(tilesetNames)
        : tilesetNames;
  } catch {
    throw new AppError("tilesetNames must be a valid JSON array of strings", 400);
  }

  if (!Array.isArray(parsedTilesetNames) || parsedTilesetNames.length === 0) {
    throw new AppError("tilesetNames must be a non-empty array", 400);
  }

  const animationGroups = extractAnimationGroups(req.files);

  // Parse grade
  const parsedGrade = grade ? parseInt(grade, 10) : null;
  if (parsedGrade && ![10, 11, 12].includes(parsedGrade)) {
    throw new AppError("grade must be 10, 11, or 12", 400);
  }

  const lesson = await lessonService.createLesson({
    title,
    content,
    tilemapJsonFile: req.files?.tilemapJson?.[0] || null,
    tilesetFiles: req.files?.tilesets || [],
    tilesetNames: parsedTilesetNames,
    animationGroups,
    spawnX,
    spawnY,
    createdBy: req.user.id,
    chapterId: chapterId || null,
    grade: parsedGrade,
    order: order !== undefined ? parseInt(order, 10) : 0,
  });

  // Invalidate list cache
  await invalidateLessonCache();

  res.status(201).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

// ─── GET /api/lessons ─────────────────────────────────────────────────
const getAllLessons = asyncHandler(async (req, res) => {
  let showAll = false;
  const token = getCookie(req, "token");
  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.id);
      if (user && ["admin", "staff", "teacher"].includes(user.role)) {
        showAll = true;
      }
    } catch (err) {
      // Ignore
    }
  }

  const filter = {};

  // Staff/admin thấy tất cả, public chỉ thấy Published
  if (!showAll) {
    filter.status = "Published";
  }

  // Lọc theo grade (query: ?grade=10)
  if (req.query.grade) {
    const grade = parseInt(req.query.grade, 10);
    if ([10, 11, 12].includes(grade)) {
      filter.grade = grade;
    }
  }

  // Lọc theo chapterId (query: ?chapterId=xxx)
  if (req.query.chapterId) {
    filter.chapterId = req.query.chapterId;
  }

  // ── Redis Cache (2-step: ETag check nhỏ → body chỉ khi cần) ─
  const cacheKey = `${LESSONS_LIST_KEY}${req.query.grade ? `:g${req.query.grade}` : ""}${req.query.chapterId ? `:c${req.query.chapterId}` : ""}`;
  if (!showAll) {
    // Bước 1: Chỉ đọc ETag (~50 bytes)
    let cachedETag = await getCacheETag(cacheKey);
    if (cachedETag && etagMatch(req.headers["if-none-match"], cachedETag)) {
      return res
        .set("Cache-Control", "public, max-age=3600")
        .status(304)
        .end();
    }

    // Bước 2: Đọc full body
    const payload = await getCachePayload(cacheKey);
    if (payload) {
      if (!cachedETag) await setCacheETag(cacheKey, payload.etag);
      if (etagMatch(req.headers["if-none-match"], payload.etag)) {
        return res
          .set("Cache-Control", "public, max-age=3600")
          .status(304)
          .end();
      }
      return res
        .status(200)
        .set("Cache-Control", "public, max-age=3600")
        .set("ETag", payload.etag)
        .type("json")
        .send(payload.body);
    }
  }
  // ──────────────────────────────────────────────────────────────

  const lessons = await lessonService.getAllLessons(filter);

  const responseData = {
    success: true,
    count: lessons.length,
    lessons: lessons.map(formatLessonResponse),
  };

  // Lưu cache kèm ETag nếu là danh sách public
  if (!showAll) {
    setCachePayload(cacheKey, responseData);
  }

  // Admin/staff xem tất cả → không cache browser, tránh lộ unpublished
  res
    .set("Cache-Control", showAll ? "no-store" : "public, max-age=3600")
    .status(200)
    .json(responseData);
});

// ─── GET /api/lessons/:id ─────────────────────────────────────────────
const getLessonById = asyncHandler(async (req, res) => {
  const cacheKey = lessonDetailKey(req.params.id);

  // ── Redis Cache (2-step: ETag check nhỏ → body chỉ khi cần) ─
  // Bước 1: Chỉ đọc ETag (~50 bytes)
  let cachedETag = await getCacheETag(cacheKey);
  if (cachedETag && etagMatch(req.headers["if-none-match"], cachedETag)) {
    return res
      .set("Cache-Control", "public, max-age=3600")
      .status(304)
      .end();
  }

  // Bước 2: Đọc full body
  const payload = await getCachePayload(cacheKey);
  if (payload) {
    if (!cachedETag) await setCacheETag(cacheKey, payload.etag);
    if (etagMatch(req.headers["if-none-match"], payload.etag)) {
      return res
        .set("Cache-Control", "public, max-age=3600")
        .status(304)
        .end();
    }
    return res
      .status(200)
      .set("Cache-Control", "public, max-age=3600")
      .set("ETag", payload.etag)
      .type("json")
      .send(payload.body);
  }
  // ──────────────────────────────────────────────────────────────

  const lesson = await lessonService.getLessonById(req.params.id);
  if (lesson.status !== "Published") {
    let authorized = false;
    const token = getCookie(req, "token");
    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        const user = await User.findById(decoded.id);
        if (user && ["admin", "staff", "teacher"].includes(user.role)) {
          authorized = true;
        }
      } catch (err) {
        // Ignore
      }
    }
    if (!authorized) {
      throw new AppError("Lesson not found", 404);
    }
  }

  const responseData = {
    success: true,
    lesson: formatLessonResponse(lesson),
  };

  // Chỉ cache lesson đã Published
  if (lesson.status === "Published") {
    setCachePayload(cacheKey, responseData);
  }

  // Lesson không Published → không cho browser cache (chỉ admin xem được)
  res
    .set("Cache-Control", lesson.status === "Published" ? "public, max-age=3600" : "no-store")
    .status(200)
    .json(responseData);
});

// ─── PUT /api/lessons/:id ─────────────────────────────────────────────
const updateLesson = asyncHandler(async (req, res) => {
  const updates = {};
  updates.status = "Pending_Review";
  updates.reviewFeedback = "";

  // Text fields
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.content !== undefined) updates.content = req.body.content;
  if (req.body.chapterId !== undefined) updates.chapterId = req.body.chapterId || null;
  if (req.body.grade !== undefined) {
    const grade = parseInt(req.body.grade, 10);
    if (grade && ![10, 11, 12].includes(grade)) throw new AppError("grade must be 10, 11, or 12", 400);
    updates.grade = grade || null;
  }
  if (req.body.order !== undefined) updates.order = parseInt(req.body.order, 10) || 0;

  // Spawn point
  if (req.body.spawnPoint?.x !== undefined) {
    updates.spawnX = Number(req.body.spawnPoint.x);
  }
  if (req.body.spawnPoint?.y !== undefined) {
    updates.spawnY = Number(req.body.spawnPoint.y);
  }

  // Tilemap JSON replacement
  if (req.files?.tilemapJson?.[0]) {
    updates.tilemapJsonFile = req.files.tilemapJson[0];
  }

  // Tileset replacement
  if (req.files?.tilesets?.length > 0) {
    updates.tilesetFiles = req.files.tilesets;

    let tilesetNames;
    try {
      tilesetNames =
        typeof req.body.tilesetNames === "string"
          ? JSON.parse(req.body.tilesetNames)
          : req.body.tilesetNames;
    } catch {
      throw new AppError("tilesetNames must be a valid JSON array", 400);
    }

    if (!Array.isArray(tilesetNames)) {
      throw new AppError("tilesetNames must be an array", 400);
    }

    updates.tilesetNames = tilesetNames;
  }

  // Character sprites replacement
  const animationGroups = extractAnimationGroups(req.files);
  if (Object.keys(animationGroups).length > 0) {
    updates.animationGroups = animationGroups;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  const lesson = await lessonService.updateLesson(req.params.id, updates);

  // Invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

// ─── DELETE /api/lessons/:id ──────────────────────────────────────────
const deleteLesson = asyncHandler(async (req, res) => {
  await lessonService.deleteLesson(req.params.id);

  // Invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    message: "Lesson deleted successfully",
  });
});

// ─── Helper: format lesson for frontend ───────────────────────────────
const formatLessonResponse = (lesson) => ({
  _id: lesson._id,
  title: lesson.title,
  content: lesson.content,
  status: lesson.status,
  reviewFeedback: lesson.reviewFeedback,
  chapterId: lesson.chapterId?._id || lesson.chapterId || null,
  chapter: lesson.chapterId && typeof lesson.chapterId === "object"
    ? { _id: lesson.chapterId._id, title: lesson.chapterId.title, grade: lesson.chapterId.grade }
    : null,
  grade: lesson.grade,
  order: lesson.order,
  podcast: lesson.podcastId && typeof lesson.podcastId === "object"
    ? {
        _id: lesson.podcastId._id,
        title: lesson.podcastId.title,
        thumbnail: lesson.podcastId.thumbnail,
        audioUrl: lesson.podcastId.audioUrl,
        level: lesson.podcastId.level,
        category: lesson.podcastId.category,
        status: lesson.podcastId.status,
        duration: lesson.podcastId.duration,
      }
    : null,
  podcastId: lesson.podcastId?._id || lesson.podcastId || null,
  createdBy: lesson.createdBy && typeof lesson.createdBy === "object"
    ? { _id: lesson.createdBy._id, name: lesson.createdBy.name, email: lesson.createdBy.email }
    : lesson.createdBy,
  game: {
    tilemapJsonUrl: lesson.game.tilemapJsonUrl,
    tilesets: lesson.game.tilesets.map((ts) => ({
      name: ts.name,
      imageUrl: ts.imageUrl,
    })),
    character: {
      animations: formatAnimations(lesson.game.character?.animations || []),
    },
    spawnPoint: {
      x: lesson.game.spawnPoint.x,
      y: lesson.game.spawnPoint.y,
    },
  },
  createdAt: lesson.createdAt,
  updatedAt: lesson.updatedAt,
});

/**
 * Convert animations array → map { idle: [...], run: [...] }
 */
const formatAnimations = (animations) => {
  const map = {};
  for (const group of animations) {
    map[group.name] = group.frames.map((f) => ({
      key: f.key,
      frame: f.frame,
      imageUrl: f.imageUrl,
    }));
  }
  return map;
};

const approveLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.updateLesson(req.params.id, {
    status: "Published",
    reviewFeedback: "",
  });

  // Status thay đổi → invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

const rejectLesson = asyncHandler(async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) {
    throw new AppError("Feedback is required to reject a lesson", 400);
  }

  const lesson = await lessonService.updateLesson(req.params.id, {
    status: "Rejected",
    reviewFeedback: feedback,
  });

  // Status thay đổi → invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

// ─── Chapter helpers (reuse curriculum controller's chapters) ────────
const Chapter = require("../models/Chapter");

const getChapters = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.grade) {
    const grade = parseInt(req.query.grade, 10);
    if ([10, 11, 12].includes(grade)) filter.grade = grade;
  }
  const chapters = await Chapter.find(filter).sort({ grade: 1, order: 1 }).lean();

  // Đếm số lesson mỗi chapter
  const Lesson = require("../models/Lesson");
  const counts = await Lesson.aggregate([
    { $match: { chapterId: { $in: chapters.map((c) => c._id) } } },
    { $group: { _id: "$chapterId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
  chapters.forEach((ch) => { ch.lessonCount = countMap[ch._id.toString()] || 0; });

  res.status(200).json({ success: true, count: chapters.length, chapters });
});

const getChaptersWithLessons = asyncHandler(async (req, res) => {
  const Lesson = require("../models/Lesson");
  const filter = {};
  if (req.query.grade) {
    const grade = parseInt(req.query.grade, 10);
    if ([10, 11, 12].includes(grade)) filter.grade = grade;
  }

  const chapters = await Chapter.find(filter).sort({ grade: 1, order: 1 }).lean();

  const lessons = await Lesson.find(
    filter.grade ? { grade: filter.grade } : {}
  )
    .populate("createdBy", "name email")
    .populate("chapterId", "title grade order")
    .populate("podcastId", "title thumbnail audioUrl level category status")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const result = chapters.map((ch) => ({
    ...ch,
    lessons: lessons
      .filter((l) => {
        const lChapterId = l.chapterId?._id?.toString() || l.chapterId?.toString();
        return lChapterId === ch._id.toString();
      })
      .map(formatLessonResponse),
  }));

  res.status(200).json({ success: true, count: chapters.length, chapters: result });
});

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  approveLesson,
  rejectLesson,
  // Chapter helpers
  getChapters,
  getChaptersWithLessons,
};
