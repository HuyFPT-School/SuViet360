const mongoose = require("mongoose");

/**
 * Chapter (Chương) — Giai đoạn / chủ đề lịch sử lớn.
 * Dùng `grade` để phân biệt khối lớp (10, 11, 12).
 * Chỉ chứa metadata nhẹ — không chứa nội dung bài học.
 *
 * Index:
 *   { grade: 1, order: 1 }  → lọc theo lớp + sắp xếp
 *   { title: "text", description: "text" }  → full-text search
 */
const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Chapter title is required"],
      trim: true,
      minlength: 2,
      maxlength: 300,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    grade: {
      type: Number,
      required: [true, "Grade is required"],
      enum: [10, 11, 12],
      index: true,
    },
    order: {
      type: Number,
      required: [true, "Order is required"],
      min: 0,
    },
    coverImage: {
      type: String,
      default: "",
    },
    coverImagePublicId: {
      type: String,
      default: "",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Index ──────────────────────────────────────────────────────
chapterSchema.index({ grade: 1, order: 1 });
chapterSchema.index({ title: "text", description: "text" });

// ── Virtual: số lượng lesson trong chapter ─────────────────────
chapterSchema.virtual("lessonCount", {
  ref: "Lesson",
  localField: "_id",
  foreignField: "chapterId",
  count: true,
});

const Chapter = mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);
module.exports = Chapter;
