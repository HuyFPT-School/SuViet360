const mongoose = require("mongoose");

const podcastCommentSchema = new mongoose.Schema(
  {
    podcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Podcast",
      required: [true, "Podcast ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

podcastCommentSchema.index({ podcastId: 1 });

module.exports =
  mongoose.models.PodcastComment ||
  mongoose.model("PodcastComment", podcastCommentSchema);
