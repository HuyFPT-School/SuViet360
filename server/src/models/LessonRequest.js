const mongoose = require("mongoose");

const lessonRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    historicalPeriod: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "InProgress", "Completed", "Rejected"],
      default: "Pending",
    },
    assignedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teacherResponse: { type: String, default: "" },
    resultLessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
  },
  { timestamps: true, collection: "gamerequests" }
);

lessonRequestSchema.index({ status: 1 });
lessonRequestSchema.index({ assignedTeacherId: 1 });

module.exports = mongoose.models.LessonRequest || mongoose.model("LessonRequest", lessonRequestSchema);
