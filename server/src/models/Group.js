const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: "",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
    memberCount: {
      type: Number,
      default: 1,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ creator: 1 });
groupSchema.index({ "members.user": 1 });
groupSchema.index({ name: "text", description: "text" });

module.exports =
  mongoose.models.Group || mongoose.model("Group", groupSchema);
