const mongoose = require("mongoose");

const podcastNoteSchema = new mongoose.Schema(
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
    timestamp: {
      type: Number, // playback time in seconds (e.g. 135)
      required: [true, "Timestamp is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Optional: Ensure compound index so queries by podcast and user are highly performant
podcastNoteSchema.index({ podcastId: 1, userId: 1 });

module.exports =
  mongoose.models.PodcastNote ||
  mongoose.model("PodcastNote", podcastNoteSchema);
