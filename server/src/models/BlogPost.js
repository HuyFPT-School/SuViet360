const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      validate: [
        (val) => val.length <= 3,
        "You can attach up to 3 images only",
      ],
      default: [],
    },
    category: {
      type: String,
      trim: true,
      default: "Chủ đề chung",
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending_Review", "Published", "Rejected"],
      default: "Pending_Review",
    },
    reviewFeedback: {
      type: String,
      default: "",
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
blogPostSchema.index({ status: 1, createdAt: -1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ title: "text", content: "text" });

module.exports = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);
