const mongoose = require("mongoose");
const Lesson = require("../models/Lesson");
const {
  uploadTilemapJson,
  uploadTilesetImage,
  uploadAnimationSprite,
  deleteCloudinaryResource,
} = require("./cloudinaryService");
const AppError = require("../utils/AppError");

const DEFAULT_ANIMATIONS = [
  {
    name: "idle",
    frames: [
      {
        key: "player-idle-0",
        frame: 1,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782640/suviet360/characters/6a619f3012f1128da11b1bd7/idle/s4ldmn4okxz8ddcjy8zj.png",
        publicId: ""
      },
      {
        key: "player-idle-1",
        frame: 2,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782641/suviet360/characters/6a619f3012f1128da11b1bd7/idle/hrzifah8plmh5cxeka0m.png",
        publicId: ""
      },
      {
        key: "player-idle-2",
        frame: 3,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782641/suviet360/characters/6a619f3012f1128da11b1bd7/idle/jbq46zp6tocep0cxkyxh.png",
        publicId: ""
      },
      {
        key: "player-idle-3",
        frame: 4,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782642/suviet360/characters/6a619f3012f1128da11b1bd7/idle/yatacjuzbnhlbptz22l6.png",
        publicId: ""
      }
    ]
  },
  {
    name: "run",
    frames: [
      {
        key: "player-run-0",
        frame: 5,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782642/suviet360/characters/6a619f3012f1128da11b1bd7/run/ty6ac0qgrcuytgmdmgh2.png",
        publicId: ""
      },
      {
        key: "player-run-1",
        frame: 6,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782643/suviet360/characters/6a619f3012f1128da11b1bd7/run/m7hevzd9yib8j4kaux8i.png",
        publicId: ""
      },
      {
        key: "player-run-2",
        frame: 7,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782644/suviet360/characters/6a619f3012f1128da11b1bd7/run/q2wctzddysysuc4qsupm.png",
        publicId: ""
      },
      {
        key: "player-run-3",
        frame: 9,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782644/suviet360/characters/6a619f3012f1128da11b1bd7/run/q1a02k3uhbkjr0iuziaa.png",
        publicId: ""
      },
      {
        key: "player-run-4",
        frame: 10,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1784782645/suviet360/characters/6a619f3012f1128da11b1bd7/run/ixnvfndrmnxq12tmqfly.png",
        publicId: ""
      }
    ]
  }
];

/**
 * Create a new lesson with uploaded map files.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.content
 * @param {Object} params.tilemapJsonFile - multer file object for JSON
 * @param {Array}  params.tilesetFiles - array of multer file objects for images
 * @param {string[]} params.tilesetNames - array of tileset names (same order as tilesetFiles)
 * @param {Object} params.animationGroups - map of animationName → file[]
 *        e.g. { idle: [file, file], run: [file, file] }
 * @param {number} params.spawnX
 * @param {number} params.spawnY
 */
const createLesson = async ({
  title,
  content,
  tilemapJsonFile,
  tilesetFiles,
  tilesetNames,
  animationGroups,
  spawnX,
  spawnY,
  createdBy,
}) => {
  if (!tilemapJsonFile) {
    throw new AppError("Tilemap JSON file is required", 400);
  }

  if (!tilesetFiles || tilesetFiles.length === 0) {
    throw new AppError("At least one tileset image is required", 400);
  }

  if (
    !tilesetNames ||
    tilesetNames.length !== tilesetFiles.length
  ) {
    throw new AppError(
      "tilesetNames must match the number of tileset images",
      400
    );
  }

  // 1. Upload tilemap JSON to Cloudinary
  const jsonUpload = await uploadTilemapJson(tilemapJsonFile.buffer);

  // 2. Upload all tileset images and map names → URLs
  const uploadedTilesets = [];
  for (let i = 0; i < tilesetFiles.length; i++) {
    const imgUpload = await uploadTilesetImage(tilesetFiles[i].buffer);
    uploadedTilesets.push({
      name: tilesetNames[i],
      imageUrl: imgUpload.secure_url,
      publicId: imgUpload.public_id,
    });
  }

  // 3. Upload animation sprites grouped by animation name
  let uploadedAnimations = [];
  if (animationGroups && Object.keys(animationGroups).length > 0) {
    const characterId = new mongoose.Types.ObjectId().toString();
    uploadedAnimations = await processAnimationGroups(animationGroups, characterId);
  }

  // If no animations were uploaded, try to clone from the latest lesson with animations
  if (uploadedAnimations.length === 0) {
    const latestLesson = await Lesson.findOne({
      "game.character.animations": { $exists: true, $not: { $size: 0 } },
    }).sort({ createdAt: -1 });

    if (latestLesson && latestLesson.game?.character?.animations?.length > 0) {
      uploadedAnimations = latestLesson.game.character.animations.map((group) => ({
        name: group.name,
        frames: group.frames.map((frame) => ({
          key: frame.key,
          frame: frame.frame,
          imageUrl: frame.imageUrl,
          publicId: "", // Empty to prevent deletion on new lesson updates
        })),
      }));
    } else {
      uploadedAnimations = DEFAULT_ANIMATIONS;
    }
  }

  // 4. Save to MongoDB
  const lesson = await Lesson.create({
    title,
    content,
    createdBy,
    game: {
      tilemapJsonUrl: jsonUpload.secure_url,
      tilemapJsonPublicId: jsonUpload.public_id,
      tilesets: uploadedTilesets,
      character: {
        animations: uploadedAnimations,
      },
      spawnPoint: {
        x: spawnX,
        y: spawnY,
      },
    },
  });

  return lesson;
};

/**
 * Get all lessons (sorted newest first).
 */
const getAllLessons = async (filter = {}) => {
  return Lesson.find(filter).populate("createdBy", "name email").sort({ createdAt: -1 });
};

/**
 * Get a single lesson by ID.
 */
const getLessonById = async (id) => {
  const lesson = await Lesson.findById(id).populate("createdBy", "name email");
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  return lesson;
};

/**
 * Update a lesson (partial update).
 *
 * Can update: title, content, spawnPoint, tilemapJson, tilesets
 */
const updateLesson = async (id, updates) => {
  const lesson = await Lesson.findById(id);
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }

  // Determine if this is a content update to a Published lesson
  const isContentUpdate = updates.title !== undefined ||
    updates.content !== undefined ||
    updates.tilemapJsonFile ||
    updates.tilesetFiles ||
    updates.animationGroups ||
    updates.spawnX !== undefined ||
    updates.spawnY !== undefined;

  const isPublishedContentUpdate = lesson.status === "Published" && isContentUpdate;

  if (isPublishedContentUpdate) {
    // Build draft object with only changed fields
    const draft = { updatedAt: new Date() };

    if (updates.title !== undefined) draft.title = updates.title;
    if (updates.content !== undefined) draft.content = updates.content;
    if (updates.spawnX !== undefined || updates.spawnY !== undefined) {
      draft.spawnPoint = {
        x: updates.spawnX !== undefined ? updates.spawnX : lesson.game.spawnPoint.x,
        y: updates.spawnY !== undefined ? updates.spawnY : lesson.game.spawnPoint.y,
      };
    }

    // Upload new tilemap JSON WITHOUT deleting old one
    if (updates.tilemapJsonFile) {
      const jsonUpload = await uploadTilemapJson(updates.tilemapJsonFile.buffer);
      draft.tilemapJsonUrl = jsonUpload.secure_url;
      draft.tilemapJsonPublicId = jsonUpload.public_id;
    }

    // Upload new tilesets WITHOUT deleting old ones
    if (updates.tilesetFiles && updates.tilesetFiles.length > 0 &&
        updates.tilesetNames && updates.tilesetNames.length === updates.tilesetFiles.length) {
      const newTilesets = [];
      for (let i = 0; i < updates.tilesetFiles.length; i++) {
        const imgUpload = await uploadTilesetImage(updates.tilesetFiles[i].buffer);
        newTilesets.push({
          name: updates.tilesetNames[i],
          imageUrl: imgUpload.secure_url,
          publicId: imgUpload.public_id,
        });
      }
      draft.tilesets = newTilesets;
    }

    // Upload new animations WITHOUT deleting old ones
    if (updates.animationGroups && Object.keys(updates.animationGroups).length > 0) {
      const characterId = new mongoose.Types.ObjectId().toString();
      const newAnimations = await processAnimationGroups(updates.animationGroups, characterId);
      draft.animations = newAnimations;
    }

    lesson.pendingDraft = draft;
    lesson.markModified("pendingDraft");
    await lesson.save();
    return lesson;
  }

  // ── Text fields ──────────────────────────────────────────────
  if (updates.title !== undefined) lesson.title = updates.title;
  if (updates.content !== undefined) lesson.content = updates.content;
  if (updates.status !== undefined) lesson.status = updates.status;
  if (updates.reviewFeedback !== undefined) lesson.reviewFeedback = updates.reviewFeedback;

  // ── Spawn point ──────────────────────────────────────────────
  if (updates.spawnX !== undefined) lesson.game.spawnPoint.x = updates.spawnX;
  if (updates.spawnY !== undefined) lesson.game.spawnPoint.y = updates.spawnY;

  // ── Replace tilemap JSON ─────────────────────────────────────
  if (updates.tilemapJsonFile) {
    // Delete old JSON from Cloudinary
    if (lesson.game.tilemapJsonPublicId) {
      await deleteCloudinaryResource(
        lesson.game.tilemapJsonPublicId,
        "raw"
      );
    }
    const jsonUpload = await uploadTilemapJson(updates.tilemapJsonFile.buffer);
    lesson.game.tilemapJsonUrl = jsonUpload.secure_url;
    lesson.game.tilemapJsonPublicId = jsonUpload.public_id;
  }

  // ── Replace tilesets ─────────────────────────────────────────
  if (
    updates.tilesetFiles &&
    updates.tilesetFiles.length > 0 &&
    updates.tilesetNames &&
    updates.tilesetNames.length === updates.tilesetFiles.length
  ) {
    // Delete old tileset images from Cloudinary
    for (const ts of lesson.game.tilesets) {
      if (ts.publicId) {
        await deleteCloudinaryResource(ts.publicId, "image");
      }
    }

    // Upload new tilesets
    const newTilesets = [];
    for (let i = 0; i < updates.tilesetFiles.length; i++) {
      const imgUpload = await uploadTilesetImage(
        updates.tilesetFiles[i].buffer
      );
      newTilesets.push({
        name: updates.tilesetNames[i],
        imageUrl: imgUpload.secure_url,
        publicId: imgUpload.public_id,
      });
    }
    lesson.game.tilesets = newTilesets;
  }

  // ── Replace character animations ─────────────────────────────
  if (
    updates.animationGroups &&
    Object.keys(updates.animationGroups).length > 0
  ) {
    // Delete ALL existing animation frames from Cloudinary
    for (const group of lesson.game.character.animations) {
      for (const frame of group.frames) {
        if (frame.publicId) {
          await deleteCloudinaryResource(frame.publicId, "image");
        }
      }
    }

    // Upload new animation groups
    const characterId = new mongoose.Types.ObjectId().toString();
    const newAnimations = await processAnimationGroups(
      updates.animationGroups,
      characterId
    );
    lesson.game.character.animations = newAnimations;
    lesson.markModified("game.character.animations");
  }

  await lesson.save();
  return lesson;
};

/**
 * Delete a lesson and its Cloudinary assets.
 */
const deleteLesson = async (id) => {
  const lesson = await Lesson.findById(id);
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }

  // Delete tilemap JSON from Cloudinary
  if (lesson.game.tilemapJsonPublicId) {
    await deleteCloudinaryResource(lesson.game.tilemapJsonPublicId, "raw");
  }

  // Delete all tileset images from Cloudinary
  for (const ts of lesson.game.tilesets) {
    if (ts.publicId) {
      await deleteCloudinaryResource(ts.publicId, "image");
    }
  }

  // Delete all character sprites from Cloudinary
  for (const group of lesson.game.character.animations) {
    for (const frame of group.frames) {
      if (frame.publicId) {
        await deleteCloudinaryResource(frame.publicId, "image");
      }
    }
  }

  // Delete pending draft assets from Cloudinary (Issue #3)
  if (lesson.pendingDraft) {
    const draft = lesson.pendingDraft;
    if (draft.tilemapJsonPublicId) {
      await deleteCloudinaryResource(draft.tilemapJsonPublicId, "raw");
    }
    if (draft.tilesets) {
      for (const ts of draft.tilesets) {
        if (ts.publicId) {
          await deleteCloudinaryResource(ts.publicId, "image");
        }
      }
    }
    if (draft.animations) {
      for (const group of draft.animations) {
        if (group.frames) {
          for (const frame of group.frames) {
            if (frame.publicId) {
              await deleteCloudinaryResource(frame.publicId, "image");
            }
          }
        }
      }
    }
  }

  // Clean UserProgress references (Issue #15)
  const UserProgress = require("../models/UserProgress");
  await UserProgress.updateMany(
    {},
    {
      $pull: { completedLessons: id, unlockedLessons: id },
    }
  );
  await UserProgress.updateMany(
    {},
    {
      $pull: { quizPerformances: { lessonId: id } }
    }
  );

  // Clean XP History (Issue #15)
  const XPHistory = require("../models/XPHistory");
  await XPHistory.deleteMany({ source: { $in: ["Lesson", "Quiz"] }, sourceId: id });

  await Lesson.findByIdAndDelete(id);
};

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract frame number from filename like "0.png" → 0, "12.png" → 12.
 * Returns null if no numeric prefix found.
 */
const extractFrameNumber = (filename) => {
  const match = filename.match(/^(\d+)\..+$/);
  return match ? Number(match[1]) : null;
};

/**
 * Process animation groups: upload files, generate keys, sort by frame.
 *
 * @param {Object} animationGroups - { idle: [file, ...], run: [file, ...] }
 * @returns {Array<{ name: string, frames: Array }>}
 */
const processAnimationGroups = async (animationGroups, characterId) => {
  if (!animationGroups || Object.keys(animationGroups).length === 0) {
    return [];
  }

  const result = [];

  for (const [animName, files] of Object.entries(animationGroups)) {
    if (!files || files.length === 0) continue;

    const frames = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const frameNum = extractFrameNumber(file.originalname);
      if (frameNum === null) {
        throw new AppError(
          `Could not parse frame number from sprite filename: ${file.originalname}`,
          400
        );
      }

      const imgUpload = await uploadAnimationSprite(file.buffer, characterId, animName);

      // Auto-generate key: player-{animationName}-{sequentialIndex}
      // Sequential index (i) ensures stable ordering regardless of filename
      const key = `player-${animName}-${i}`;

      frames.push({
        key,
        frame: frameNum,
        imageUrl: imgUpload.secure_url,
        publicId: imgUpload.public_id,
      });
    }

    // Sort by frame number ascending for consistent animation order
    frames.sort((a, b) => a.frame - b.frame);

    result.push({ name: animName, frames });
  }

  return result;
};

/**
 * Apply pending draft to the lesson (used when teacher approves).
 * Overwrites main fields with draft content, deletes old Cloudinary assets.
 */
const applyDraft = async (id) => {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw new AppError("Lesson not found", 404);
  if (!lesson.pendingDraft) return lesson; // Nothing to apply

  const draft = lesson.pendingDraft;

  // Apply text fields
  if (draft.title !== undefined) lesson.title = draft.title;
  if (draft.content !== undefined) lesson.content = draft.content;
  if (draft.spawnPoint) {
    lesson.game.spawnPoint.x = draft.spawnPoint.x;
    lesson.game.spawnPoint.y = draft.spawnPoint.y;
  }

  // Apply tilemap JSON (delete old, use new from draft)
  if (draft.tilemapJsonUrl) {
    if (lesson.game.tilemapJsonPublicId) {
      await deleteCloudinaryResource(lesson.game.tilemapJsonPublicId, "raw");
    }
    lesson.game.tilemapJsonUrl = draft.tilemapJsonUrl;
    lesson.game.tilemapJsonPublicId = draft.tilemapJsonPublicId;
  }

  // Apply tilesets (delete old, use new from draft)
  if (draft.tilesets) {
    for (const ts of lesson.game.tilesets) {
      if (ts.publicId) {
        await deleteCloudinaryResource(ts.publicId, "image");
      }
    }
    lesson.game.tilesets = draft.tilesets;
  }

  // Apply animations (delete old, use new from draft)
  if (draft.animations) {
    for (const group of lesson.game.character.animations) {
      for (const frame of group.frames) {
        if (frame.publicId) {
          await deleteCloudinaryResource(frame.publicId, "image");
        }
      }
    }
    lesson.game.character.animations = draft.animations;
    lesson.markModified("game.character.animations");
  }

  // Clear draft and keep Published status
  lesson.pendingDraft = null;
  lesson.markModified("pendingDraft");
  lesson.status = "Published";
  lesson.reviewFeedback = "";

  await lesson.save();
  return lesson;
};

/**
 * Discard pending draft (used when teacher rejects).
 * Deletes NEW Cloudinary assets from the draft, keeps old content.
 */
const discardDraft = async (id, feedback) => {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw new AppError("Lesson not found", 404);
  if (!lesson.pendingDraft) return lesson; // Nothing to discard

  const draft = lesson.pendingDraft;

  // Delete draft Cloudinary assets
  if (draft.tilemapJsonPublicId) {
    await deleteCloudinaryResource(draft.tilemapJsonPublicId, "raw");
  }
  if (draft.tilesets) {
    for (const ts of draft.tilesets) {
      if (ts.publicId) {
        await deleteCloudinaryResource(ts.publicId, "image");
      }
    }
  }
  if (draft.animations) {
    for (const group of draft.animations) {
      for (const frame of group.frames) {
        if (frame.publicId) {
          await deleteCloudinaryResource(frame.publicId, "image");
        }
      }
    }
  }

  // Clear draft, keep Published status, set feedback
  lesson.pendingDraft = null;
  lesson.markModified("pendingDraft");
  lesson.reviewFeedback = feedback || "Bản cập nhật không được duyệt.";

  await lesson.save();
  return lesson;
};

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  applyDraft,
  discardDraft,
};
