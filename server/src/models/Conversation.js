const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: [true, "Participants are required"],
      validate: {
        validator: function (val) {
          return val.length === 2;
        },
        message: "A conversation must have exactly 2 participants",
      },
    },
    lastMessage: {
      content: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ "lastMessage.createdAt": -1 });

module.exports =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
