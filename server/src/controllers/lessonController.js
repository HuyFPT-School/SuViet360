const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const lessonService = require("../services/lessonService");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");

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

  const lesson = await lessonService.createLesson({
    title,
    content,
    tilemapJsonFile: req.files?.tilemapJson?.[0] || null,
    tilesetFiles: req.files?.tilesets || [],
    tilesetNames: parsedTilesetNames,
    animationGroups,
    spawnX,
    spawnY,
  });

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

  const filter = showAll ? {} : { status: "Published" };
  const lessons = await lessonService.getAllLessons(filter);

  res.status(200).json({
    success: true,
    count: lessons.length,
    lessons: lessons.map(formatLessonResponse),
  });
});

// ─── GET /api/lessons/:id ─────────────────────────────────────────────
const getLessonById = asyncHandler(async (req, res) => {
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

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

// ─── PUT /api/lessons/:id ─────────────────────────────────────────────
const updateLesson = asyncHandler(async (req, res) => {
  const updates = {};
  updates.status = "Pending_Review";
  updates.reviewFeedback = "";

  // Text fields
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.content !== undefined) updates.content = req.body.content;

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

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
  });
});

// ─── DELETE /api/lessons/:id ──────────────────────────────────────────
const deleteLesson = asyncHandler(async (req, res) => {
  await lessonService.deleteLesson(req.params.id);

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

  res.status(200).json({
    success: true,
    lesson: formatLessonResponse(lesson),
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
