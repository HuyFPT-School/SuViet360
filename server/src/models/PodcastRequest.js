const mongoose = require("mongoose");

const podcastRequestSchema = new mongoose.Schema(
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
    resultPodcastId: { type: mongoose.Schema.Types.ObjectId, ref: "Podcast", default: null },
    needsGameCreation: { type: Boolean, default: false },
    gameCreationStatus: {
      type: String,
      enum: ["None", "Requested", "Completed"],
      default: "None",
    },
    pedagogicalNotes: { type: String, default: "" },
    estimatedCompletionDate: { type: Date, default: null },
  },
  { timestamps: true, collection: "podcastrequests" }
);

podcastRequestSchema.index({ status: 1 });
podcastRequestSchema.index({ assignedTeacherId: 1 });

module.exports = mongoose.models.PodcastRequest || mongoose.model("PodcastRequest", podcastRequestSchema);
