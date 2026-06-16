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
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201247/suviet360/characters/6a2af95e4c9d3ff442fd8f38/idle/eumvtkr5hfccyf2pnpl7.png",
        publicId: ""
      },
      {
        key: "player-idle-1",
        frame: 2,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201249/suviet360/characters/6a2af95e4c9d3ff442fd8f38/idle/cixrwgikmkidhzztqwgk.png",
        publicId: ""
      },
      {
        key: "player-idle-2",
        frame: 3,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201250/suviet360/characters/6a2af95e4c9d3ff442fd8f38/idle/ycshcervjyffrgdnhu2g.png",
        publicId: ""
      },
      {
        key: "player-idle-3",
        frame: 4,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201253/suviet360/characters/6a2af95e4c9d3ff442fd8f38/idle/caa33tesryog46arnddo.png",
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
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201254/suviet360/characters/6a2af95e4c9d3ff442fd8f38/run/f0cpsgukkhrlpjmn54l6.png",
        publicId: ""
      },
      {
        key: "player-run-1",
        frame: 6,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201255/suviet360/characters/6a2af95e4c9d3ff442fd8f38/run/dyiibnswiksor2yoqxbp.png",
        publicId: ""
      },
      {
        key: "player-run-2",
        frame: 7,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201257/suviet360/characters/6a2af95e4c9d3ff442fd8f38/run/hkp2vhguoafabhkecxeh.png",
        publicId: ""
      },
      {
        key: "player-run-3",
        frame: 8,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201258/suviet360/characters/6a2af95e4c9d3ff442fd8f38/run/wgwiqmxrphgqppgfrj0q.png",
        publicId: ""
      },
      {
        key: "player-run-4",
        frame: 9,
        imageUrl: "https://res.cloudinary.com/dt6uoyt1t/image/upload/v1781201260/suviet360/characters/6a2af95e4c9d3ff442fd8f38/run/jk3cvlak02cp5yqsdqjc.png",
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
  return Lesson.find(filter).sort({ createdAt: -1 });
};

/**
 * Get a single lesson by ID.
 */
const getLessonById = async (id) => {
  const lesson = await Lesson.findById(id);
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

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
};
