const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionTier", required: true },
    status: { type: String, enum: ["Active", "Expired", "Cancelled"], default: "Active" },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
    autoRenew: { type: Boolean, default: false },
    giftedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    giftMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

subscriptionSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
