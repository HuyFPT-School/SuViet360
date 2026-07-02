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
    level: {
      type: String,
      trim: true,
      default: "Medium",
    },
    category: {
      type: String,
      trim: true,
      default: "Chủ đề chung",
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
      type: String,
      enum: ["Draft", "Pending_Review", "Published", "Rejected"],
      default: "Pending_Review",
    },
    reviewFeedback: {
      type: String,
      default: "",
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    pendingDraft: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Podcast || mongoose.model("Podcast", podcastSchema);
