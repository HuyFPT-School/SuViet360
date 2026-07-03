const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    maxUses: { type: Number, default: -1 },
    usedCount: { type: Number, default: 0 },
    minPurchaseAmount: { type: Number, default: 0 },
    applicableTiers: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionTier" }],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ endDate: 1, isActive: 1 });

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
