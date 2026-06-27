const mongoose = require("mongoose");

const blogReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter is required"],
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
    reason: {
      type: String,
      enum: ["Spam", "Offensive_Language", "Historical_Inaccuracy", "Harassment", "Other"],
      required: [true, "Reason is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Resolved_Deleted", "Resolved_Dismissed"],
      default: "Pending",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
blogReportSchema.index({ status: 1, createdAt: -1 });
blogReportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.models.BlogReport || mongoose.model("BlogReport", blogReportSchema);
