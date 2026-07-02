const mongoose = require("mongoose");

/**
 * Quiz — Ngân hàng câu hỏi trắc nghiệm (nặng).
 * Tách riêng để:
 *   1. Lazy-load: chỉ load khi user scroll đến quiz
 *   2. Reuse: 1 bộ quiz có thể dùng cho nhiều LessonPart
 *   3. Dễ phân tích kết quả (tham chiếu từ UserProgress)
 *
 * Index: { status: 1 }
 */
const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    timeLimit: {
      type: Number, // giây, null = không giới hạn
      default: null,
      min: 0,
    },
    passScore: {
      type: Number, // phần trăm, VD: 60
      default: 60,
      min: 0,
      max: 100,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: true,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        options: {
          type: [String],
          required: true,
          validate: {
            validator: (arr) => arr.length >= 2 && arr.length <= 6,
            message: "Must have 2-6 options",
          },
        },
        correctIndex: {
          type: Number,
          required: true,
          min: 0,
        },
        explanation: {
          type: String,
          default: "",
          maxlength: 1000,
        },
        image: {
          type: String,
          default: "",
        },
        points: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
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

quizSchema.index({ status: 1 });

// Virtual: tổng điểm tối đa
quizSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
});

// Virtual: số câu hỏi
quizSchema.virtual("questionCount").get(function () {
  return this.questions.length;
});

module.exports =
  mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
