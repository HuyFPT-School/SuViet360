const mongoose = require("mongoose");
const crypto = require("crypto");

const giftCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      default: function () {
        const parts = [];
        for (let i = 0; i < 3; i++) {
          parts.push(crypto.randomBytes(2).toString("hex").toUpperCase());
        }
        return `GIFT-${parts.join("-")}`;
      },
    },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionTier", required: true },
    billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientEmail: { type: String, default: "" },
    giftMessage: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Redeemed", "Expired"], default: "Pending" },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    redeemedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },
  },
  { timestamps: true }
);

giftCodeSchema.index({ expiresAt: 1 });

module.exports = mongoose.models.GiftCode || mongoose.model("GiftCode", giftCodeSchema);
