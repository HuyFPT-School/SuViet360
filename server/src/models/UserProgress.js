const mongoose = require("mongoose");

/**
 * UserProgress — Tiến độ học tập của người dùng.
 * Tách riêng khỏi content để:
 *   1. Content model sạch, không bị pollute bởi user data
 *   2. Dễ shard theo userId khi scale
 *   3. Dễ phân tích (analytics)
 *
 * Index:
 *   { userId: 1, lessonId: 1 } → unique compound: mỗi user chỉ có 1 progress/lesson
 *   { userId: 1, updatedAt: -1 } → lấy danh sách bài đang học gần đây
 */
const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurriculumLesson",
      required: [true, "Lesson ID is required"],
    },
    // Danh sách partId đã hoàn thành
    completedParts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LessonPart",
      },
    ],
    // Kết quả quiz (1 user có thể làm lại quiz nhiều lần)
    quizResults: [
      {
        quizId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz",
          required: true,
        },
        score: { type: Number, required: true },
        totalPoints: { type: Number, required: true },
        passed: { type: Boolean, default: false },
        answers: [
          {
            questionIndex: Number,
            selectedIndex: Number,
            correct: Boolean,
          },
        ],
        completedAt: { type: Date, default: Date.now },
      },
    ],
    // Kết quả game
    gameResults: [
      {
        gameId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Game",
          required: true,
        },
        score: { type: Number, default: 0 },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    // Vị trí đang học dở (để user quay lại học tiếp)
    lastPosition: {
      partId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LessonPart",
      },
      blockIndex: { type: Number, default: 0 },
    },
    // Tổng thời gian học (giây)
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Index ──────────────────────────────────────────────────────
// Mỗi user chỉ có 1 progress record cho 1 lesson
userProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
// Lấy danh sách bài đang học gần đây
userProgressSchema.index({ userId: 1, updatedAt: -1 });

module.exports =
  mongoose.models.UserProgress ||
  mongoose.model("UserProgress", userProgressSchema);
