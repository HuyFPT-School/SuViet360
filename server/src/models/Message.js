const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation is required"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
