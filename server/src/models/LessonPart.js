const mongoose = require("mongoose");

/**
 * LessonPart (Phần bài học) — Chia nhỏ một Lesson thành các phần.
 * Mỗi Part chứa contentBlocks nội dòng (text, image, audio, timeline…) VÀ
 * reference đến Game/Quiz (collection riêng) để lazy-load.
 *
 * Index: { lessonId: 1, order: 1 }
 */
const lessonPartSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Part title is required"],
      trim: true,
      maxlength: 300,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "Lesson ID is required"],
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    learningObjective: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    estimatedMinutes: {
      type: Number,
      default: 5,
      min: 1,
    },
    /**
     * contentBlocks: mảng nội dung đa dạng.
     * Mỗi block có:
     *   - type: "text" | "image" | "audio" | "video" | "timeline" | "quote" | "map" | "document" | "game" | "quiz"
     *   - data: nội dung hoặc reference ({ gameId, quizId })
     *   - order: thứ tự hiển thị
     *
     * Block nhẹ (text, quote, timeline): data chứa trực tiếp.
     * Block media (image, audio, video): data chứa URL.
     * Block nặng (game, quiz): data CHỈ chứa { gameId|quizId, label } → lazy-load.
     */
    contentBlocks: [
      {
        type: {
          type: String,
          required: true,
          enum: [
            "text",
            "image",
            "audio",
            "video",
            "timeline",
            "quote",
            "map",
            "document",
            "game",
            "quiz",
          ],
        },
        data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },
  },
  {
    timestamps: true,
  }
);

lessonPartSchema.index({ lessonId: 1, order: 1 });

module.exports =
  mongoose.models.LessonPart || mongoose.model("LessonPart", lessonPartSchema);
