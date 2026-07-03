const mongoose = require("mongoose");
const crypto = require("crypto");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      default: function () {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
        return `TXN-${date}-${rand}`;
      },
    },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionTier", required: true },
    amount: { type: Number, required: true },
    originalAmount: { type: Number, required: true },
    currency: { type: String, default: "VND" },
    billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
    status: { type: String, enum: ["Pending", "Completed", "Failed", "Refunded"], default: "Pending" },
    paymentMethod: { type: String, default: "demo" },
    paymentGatewayRef: { type: String, default: "" },
    isGift: { type: Boolean, default: false },
    giftMessage: { type: String, default: "" },
    couponCode: { type: String, default: "" },
    discountAmount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
