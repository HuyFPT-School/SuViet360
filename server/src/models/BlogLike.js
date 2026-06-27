const mongoose = require("mongoose");

const blogLikeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    targetType: {
      type: String,
      enum: ["Post", "Comment"],
      required: [true, "Target type is required"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Target ID is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only like a post or comment once
blogLikeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.models.BlogLike || mongoose.model("BlogLike", blogLikeSchema);
