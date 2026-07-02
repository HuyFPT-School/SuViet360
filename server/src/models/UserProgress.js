const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    completedPodcasts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Podcast",
      },
    ],
    quizPerformances: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
        total: {
          type: Number,
          required: true,
        },
        passed: {
          type: Boolean,
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    unlockedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.UserProgress ||
  mongoose.model("UserProgress", userProgressSchema);
