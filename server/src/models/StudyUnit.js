const mongoose = require("mongoose");

const contentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Block type is required"],
      enum: ["text", "image", "audio", "video", "timeline", "quote", "map", "podcast", "game", "quiz"],
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, required: [true, "Block order is required"], default: 0 },
  },
  { _id: false }
);

const studyUnitSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 300 },
    summary: { type: String, default: "", trim: true, maxlength: 1000 },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: [true, "Chapter ID is required"], index: true },
    order: { type: Number, required: [true, "Order is required"], default: 0 },
    duration: { type: Number, default: 15 }, // in minutes
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    tags: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    contentBlocks: { type: [contentBlockSchema], default: [] },
    status: { type: String, enum: ["Draft", "Pending_Review", "Published", "Rejected"], default: "Draft" },
    reviewFeedback: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    pendingDraft: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

studyUnitSchema.index({ chapterId: 1, order: 1 });

module.exports = mongoose.models.StudyUnit || mongoose.model("StudyUnit", studyUnitSchema);
