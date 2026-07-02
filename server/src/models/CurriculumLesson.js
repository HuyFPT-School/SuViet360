const mongoose = require("mongoose");

/**
 * CurriculumLesson (Bài học trong chương trình) — phiên bản nhẹ, chỉ metadata.
 * KHÔNG chứa game config hay nội dung. Game → collection "games", Quiz → "quizzes".
 *
 * Model name "CurriculumLesson" → collection "curriculumlessons" (tránh xung đột với Lesson cũ).
 *
 * Index:
 *   { chapterId: 1, order: 1 } → danh sách bài trong chương, sorted
 *   { tags: 1 }                → filter theo tag
 *   { title: "text", tags: "text" } → full-text search
 */
const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      minlength: 2,
      maxlength: 300,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: [true, "Chapter ID is required"],
      index: true,
    },
    order: {
      type: Number,
      required: [true, "Order within chapter is required"],
      min: 0,
    },
    duration: {
      type: Number,
      default: 15,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    tags: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Pending_Review", "Published", "Rejected"],
      default: "Draft",
    },
    reviewFeedback: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Index ──────────────────────────────────────────────────────
lessonSchema.index({ chapterId: 1, order: 1 });
lessonSchema.index({ tags: 1 });
lessonSchema.index({ title: "text", tags: "text" });

// ── Virtuals ────────────────────────────────────────────────────
lessonSchema.virtual("partCount", {
  ref: "LessonPart",
  localField: "_id",
  foreignField: "lessonId",
  count: true,
});

module.exports =
  mongoose.models.CurriculumLesson ||
  mongoose.model("CurriculumLesson", lessonSchema);
