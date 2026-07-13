const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: [true, "Question text is required"], trim: true, maxlength: 1000 },
    options: {
      type: [String],
      required: [true, "Options are required"],
      validate: [
        (val) => val.length >= 2 && val.length <= 6,
        "Options must be between 2 and 6 items",
      ],
    },
    correctIndex: { type: Number, required: [true, "Correct index is required"], min: 0 },
    explanation: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 300 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    timeLimit: { type: Number, default: null }, // in seconds, null = no limit
    passScore: { type: Number, default: 60 }, // percentage
    shuffleQuestions: { type: Boolean, default: false },
    status: { type: String, enum: ["Draft", "Pending_Review", "Published", "Rejected"], default: "Draft" },
    reviewFeedback: { type: String, default: "" },
    questions: { type: [quizQuestionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    pendingDraft: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
