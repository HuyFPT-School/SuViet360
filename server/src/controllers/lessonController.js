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
  const { title, content, spawnPoint, tilesetNames } = req.body;

  if (!title || !content) {
    throw new AppError("Title and content are required", 400);
  }

  let spawnX = spawnPoint?.x !== undefined ? Number(spawnPoint.x) : NaN;
  let spawnY = spawnPoint?.y !== undefined ? Number(spawnPoint.y) : NaN;

  // Fallback for flat fields from multipart form-data (e.g. spawnPoint[x])
  if (isNaN(spawnX) && req.body["spawnPoint[x]"] !== undefined) {
    spawnX = Number(req.body["spawnPoint[x]"]);
  }
  if (isNaN(spawnY) && req.body["spawnPoint[y]"] !== undefined) {
    spawnY = Number(req.body["spawnPoint[y]"]);
  }

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
  // 1. If protect middleware already ran, req.user is set
  if (req.user && ["admin", "staff", "teacher"].includes(req.user.role)) {
    showAll = true;
  } else {
    // 2. Fallback: check cookie or Authorization header
    let token = getCookie(req, "token");
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
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
  }

  const filter = showAll ? {} : { status: "Published" };

  // ── Redis Cache (2-step: ETag check nhỏ → body chỉ khi cần) ─
  if (!showAll) {
    // Bước 1: Chỉ đọc ETag (~50 bytes)
    let cachedETag = await getCacheETag(LESSONS_LIST_KEY);
    if (cachedETag && etagMatch(req.headers["if-none-match"], cachedETag)) {
      return res
        .set("Cache-Control", "no-cache")
        .status(304)
        .end();
    }

    // Bước 2: Đọc full body
    const payload = await getCachePayload(LESSONS_LIST_KEY);
    if (payload) {
      if (!cachedETag) await setCacheETag(LESSONS_LIST_KEY, payload.etag);
      if (etagMatch(req.headers["if-none-match"], payload.etag)) {
        return res
          .set("Cache-Control", "no-cache")
          .status(304)
          .end();
      }
      return res
        .status(200)
        .set("Cache-Control", "no-cache")
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
    setCachePayload(LESSONS_LIST_KEY, responseData);
  }

  // Admin/staff xem tất cả → không cache browser, tránh lộ unpublished
  res
    .set("Cache-Control", showAll ? "no-store" : "no-cache")
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
      .set("Cache-Control", "no-cache")
      .status(304)
      .end();
  }

  // Bước 2: Đọc full body
  const payload = await getCachePayload(cacheKey);
  if (payload) {
    if (!cachedETag) await setCacheETag(cacheKey, payload.etag);
    if (etagMatch(req.headers["if-none-match"], payload.etag)) {
      return res
        .set("Cache-Control", "no-cache")
        .status(304)
        .end();
    }
    return res
      .status(200)
      .set("Cache-Control", "no-cache")
      .set("ETag", payload.etag)
      .type("json")
      .send(payload.body);
  }
  // ──────────────────────────────────────────────────────────────

  const lesson = await lessonService.getLessonById(req.params.id);
  if (lesson.status !== "Published") {
    let authorized = false;
    let token = getCookie(req, "token");
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
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
    .set("Cache-Control", lesson.status === "Published" ? "no-cache" : "no-store")
    .status(200)
    .json(responseData);
});

// ─── PUT /api/lessons/:id ─────────────────────────────────────────────
const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.getLessonById(req.params.id);

  // Ownership check (Issue #16)
  if (lesson.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
    throw new AppError("You are not authorized to update this lesson", 403);
  }

  const updates = {};
  // Only change status to Pending_Review for non-Published lessons
  // For Published lessons, the service layer saves to pendingDraft instead
  if (lesson.status !== "Published") {
    updates.status = "Pending_Review";
    updates.reviewFeedback = "";
  }

  // Text fields
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.content !== undefined) updates.content = req.body.content;

  // Spawn point
  let spawnX = req.body.spawnPoint?.x !== undefined ? Number(req.body.spawnPoint.x) : undefined;
  let spawnY = req.body.spawnPoint?.y !== undefined ? Number(req.body.spawnPoint.y) : undefined;

  // Fallback for flat fields from multipart form-data (e.g. spawnPoint[x])
  if (spawnX === undefined && req.body["spawnPoint[x]"] !== undefined) {
    spawnX = Number(req.body["spawnPoint[x]"]);
  }
  if (spawnY === undefined && req.body["spawnPoint[y]"] !== undefined) {
    spawnY = Number(req.body["spawnPoint[y]"]);
  }

  if (spawnX !== undefined && !isNaN(spawnX)) updates.spawnX = spawnX;
  if (spawnY !== undefined && !isNaN(spawnY)) updates.spawnY = spawnY;

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

  const updatedLesson = await lessonService.updateLesson(req.params.id, updates);

  // Invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(updatedLesson),
  });
});

// ─── DELETE /api/lessons/:id ──────────────────────────────────────────
const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.getLessonById(req.params.id);

  // Ownership check (Issue #16)
  if (lesson.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
    throw new AppError("You are not authorized to delete this lesson", 403);
  }

  await lessonService.deleteLesson(req.params.id);

  // Invalidate cache
  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    message: "Lesson deleted successfully",
  });
});

// ─── Helper: format lesson for frontend ───────────────────────────────
const formatLessonDraft = (draft) => {
  if (!draft) return null;
  return {
    title: draft.title,
    content: draft.content,
    spawnPoint: draft.spawnPoint,
    tilemapJsonUrl: draft.tilemapJsonUrl,
    tilesets: draft.tilesets ? draft.tilesets.map((ts) => ({
      name: ts.name,
      imageUrl: ts.imageUrl,
    })) : undefined,
    animations: draft.animations ? formatAnimations(draft.animations) : undefined,
    updatedAt: draft.updatedAt,
  };
};

const formatLessonResponse = (lesson) => ({
  _id: lesson._id,
  title: lesson.title,
  content: lesson.content,
  status: lesson.status,
  reviewFeedback: lesson.reviewFeedback,
  hasPendingDraft: !!lesson.pendingDraft,
  pendingDraft: formatLessonDraft(lesson.pendingDraft),
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
  createdBy: lesson.createdBy,
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
  const lesson = await lessonService.getLessonById(req.params.id);

  if (lesson.pendingDraft) {
    // Has a pending draft → apply it
    const updated = await lessonService.applyDraft(req.params.id);
    await invalidateLessonCache(req.params.id);
    return res.status(200).json({
      success: true,
      lesson: formatLessonResponse(updated),
    });
  }

  // No draft → normal approve (Draft/Pending_Review → Published)
  const updated = await lessonService.updateLesson(req.params.id, {
    status: "Published",
    reviewFeedback: "",
  });

  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(updated),
  });
});

const rejectLesson = asyncHandler(async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) {
    throw new AppError("Feedback is required to reject a lesson", 400);
  }

  const lesson = await lessonService.getLessonById(req.params.id);

  if (lesson.pendingDraft) {
    // Has a pending draft → discard it, keep old Published content
    const updated = await lessonService.discardDraft(req.params.id, feedback);
    await invalidateLessonCache(req.params.id);
    return res.status(200).json({
      success: true,
      lesson: formatLessonResponse(updated),
    });
  }

  // No draft → normal reject
  const updated = await lessonService.updateLesson(req.params.id, {
    status: "Rejected",
    reviewFeedback: feedback,
  });

  await invalidateLessonCache(req.params.id);

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(updated),
  });
});

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  approveLesson,
  rejectLesson,
};
