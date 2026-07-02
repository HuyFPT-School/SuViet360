const mongoose = require("mongoose");

/**
 * Game — Chứa toàn bộ config game Phaser (nặng).
 * Tách riêng để:
 *   1. Lazy-load: chỉ load khi user scroll đến game
 *   2. Reuse: 1 game có thể dùng cho nhiều LessonPart
 *   3. Dễ cache riêng (Redis key riêng, CDN cho assets)
 *
 * Index: { gameType: 1 }
 */
const gameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Game title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["quiz_map", "puzzle", "drag_drop", "rpg", "memory", "timeline_sort"],
    },
    thumbnail: {
      type: String,
      default: "",
    },
    /**
     * config: toàn bộ config Phaser.
     * Bao gồm: tilemapJsonUrl, tilesets, character animations, spawnPoint, ...
     */
    config: {
      tilemapJsonUrl: { type: String, default: "" },
      tilemapJsonPublicId: { type: String, default: "" },
      tilesets: [
        {
          name: { type: String, required: true },
          imageUrl: { type: String, required: true },
          publicId: { type: String, default: "" },
        },
      ],
      character: {
        animations: [
          {
            name: {
              type: String,
              enum: ["idle", "run", "attack", "jump", "hurt", "dead"],
            },
            frames: [
              {
                key: String,
                frame: Number,
                imageUrl: String,
                publicId: { type: String, default: "" },
              },
            ],
          },
        ],
      },
      spawnPoint: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      // Mở rộng thêm cho các game type khác
      extra: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

gameSchema.index({ gameType: 1 });
gameSchema.index({ status: 1 });

module.exports =
  mongoose.models.Game || mongoose.model("Game", gameSchema);
