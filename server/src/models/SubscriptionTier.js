const mongoose = require("mongoose");

const subscriptionTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    priceMonthly: { type: Number, required: true, default: 0 },
    priceYearly: { type: Number, required: true, default: 0 },
    features: {
      dailyAIQueries: { type: Number, default: 3 },
      premiumLessons: { type: Boolean, default: false },
      customLessonRequest: { type: Boolean, default: false },
      bonusXPMultiplier: { type: Number, default: 1.0 },
    },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    description: { type: String, default: "" },
    badge: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SubscriptionTier || mongoose.model("SubscriptionTier", subscriptionTierSchema);
