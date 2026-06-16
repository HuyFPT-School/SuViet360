const mongoose = require("mongoose");

const tilesetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tileset name is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Tileset image URL is required"],
    },
    publicId: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const animationFrameSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Animation frame key is required"],
      trim: true,
    },
    frame: {
      type: Number,
      required: [true, "Frame number is required"],
      min: 0,
    },
    imageUrl: {
      type: String,
      required: [true, "Animation frame image URL is required"],
    },
    publicId: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const animationGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Animation name is required"],
      trim: true,
      lowercase: true,
      enum: ["idle", "run", "attack", "jump", "hurt", "dead"],
    },
    frames: {
      type: [animationFrameSchema],
      default: [],
    },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: 10000,
    },
    game: {
      tilemapJsonUrl: {
        type: String,
        required: [true, "Tilemap JSON URL is required"],
      },
      tilemapJsonPublicId: {
        type: String,
        default: "",
      },
      tilesets: {
        type: [tilesetSchema],
        default: [],
      },
      character: {
        animations: {
          type: [animationGroupSchema],
          default: [],
        },
      },
      spawnPoint: {
        x: {
          type: Number,
          required: [true, "Spawn point X is required"],
          min: 0,
        },
        y: {
          type: Number,
          required: [true, "Spawn point Y is required"],
          min: 0,
        },
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Pending_Review", "Published", "Rejected"],
      default: "Pending_Review",
    },
    reviewFeedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Lesson = mongoose.model("Lesson", lessonSchema);

module.exports = Lesson;
