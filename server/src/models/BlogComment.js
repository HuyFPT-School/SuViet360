const mongoose = require("mongoose");

const blogCommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogPost",
      required: [true, "Post ID is required"],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogComment",
      default: null,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Visible", "Hidden", "Removed"],
      default: "Visible",
    },
  },
  {
    timestamps: true,
  }
);

blogCommentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

module.exports = mongoose.models.BlogComment || mongoose.model("BlogComment", blogCommentSchema);
