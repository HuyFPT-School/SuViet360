const mongoose = require("mongoose");

const podcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail is required"],
    },
    thumbnailPublicId: {
      type: String,
      default: "",
    },
    audioUrl: {
      type: String,
      required: [true, "Audio URL is required"],
    },
    audioPublicId: {
      type: String,
      default: "",
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    level: {
      type: String,
      trim: true,
      default: "Medium",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Podcast || mongoose.model("Podcast", podcastSchema);
