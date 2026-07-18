const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true,
    },
    type: {
      type: String,
      enum: [
        "New_Podcast",
        "System",
        "Subscription_Activated",
        "Gift_Received",
        "Subscription_Expired",
        "Subscription_Expiring",
        "Lesson_Request_New",
        "Lesson_Request_Accepted",
        "Lesson_Request_Rejected",
        "Friend_Request",
        "Friend_Accepted"
      ],
      default: "System",
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    link: {
      type: String,
      required: [true, "Redirect link is required"],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for loading unread notifications fast
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// TTL Index: Auto-delete read notifications after 3 days (3 days * 24h * 60m * 60s = 259200 seconds)
notificationSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 259200,
    partialFilterExpression: { isRead: true }
  }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
