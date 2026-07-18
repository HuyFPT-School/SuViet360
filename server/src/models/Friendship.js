const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester is required"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique friendship pair (one request between any two users)
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
// Fast lookup: find all friendships involving a user
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

module.exports =
  mongoose.models.Friendship ||
  mongoose.model("Friendship", friendshipSchema);
