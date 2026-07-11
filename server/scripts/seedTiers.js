const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const env = require("../src/config/env");
const SubscriptionTier = require("../src/models/SubscriptionTier");

const tiers = [
  {
    name: "Free",
    slug: "free",
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      dailyAIQueries: 3,
      premiumLessons: false,
      customLessonRequest: false,
      bonusXPMultiplier: 1.0,
    },
    isActive: true,
    displayOrder: 0,
    description: "Trải nghiệm cơ bản với các bài học lịch sử Việt Nam",
    badge: "Free",
  },
  {
    name: "Student Plus",
    slug: "student-plus",
    priceMonthly: 49000,
    priceYearly: 490000,
    features: {
      dailyAIQueries: 20,
      premiumLessons: true,
      customLessonRequest: false,
      bonusXPMultiplier: 1.5,
    },
    isActive: true,
    displayOrder: 1,
    description: "Mở khóa bài học premium và tăng tốc học tập",
    badge: "Plus",
  },
  {
    name: "Student Pro",
    slug: "student-pro",
    priceMonthly: 99000,
    priceYearly: 990000,
    features: {
      dailyAIQueries: -1,
      premiumLessons: true,
      customLessonRequest: true,
      bonusXPMultiplier: 2.0,
    },
    isActive: true,
    displayOrder: 2,
    description: "Trải nghiệm tối đa với AI không giới hạn và yêu cầu bài học riêng",
    badge: "Pro",
  },
];

const seedTiers = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    for (const tierData of tiers) {
      await SubscriptionTier.findOneAndUpdate(
        { slug: tierData.slug },
        tierData,
        { upsert: true, new: true }
      );
      console.log(`Upserted tier: ${tierData.name}`);
    }

    console.log("Seed completed!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

seedTiers();
