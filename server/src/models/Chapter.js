const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 300 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    grade: { type: Number, required: [true, "Grade is required"], enum: [10, 11, 12] },
    order: { type: Number, required: [true, "Order is required"], default: 0 },
    coverImage: { type: String, default: "" },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

chapterSchema.index({ grade: 1, order: 1 });

module.exports = mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);
