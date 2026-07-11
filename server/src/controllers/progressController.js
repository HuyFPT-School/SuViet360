const User = require("../models/User");
const UserProgress = require("../models/UserProgress");
const XPHistory = require("../models/XPHistory");
const Lesson = require("../models/Lesson");
const Podcast = require("../models/Podcast");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { redisClient, isRedisReady } = require("../config/redis");

// XP Constants
const XP_LESSON = 100;
const XP_PODCAST = 50;
const XP_QUIZ_PASS = 150;
const XP_QUIZ_FAIL = 50;

/**
 * Leveling formula: Level = Math.floor(Math.sqrt(XP / 100)) + 1
 */
const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

/**
 * Helper to fetch user's subscription tier XP multiplier.
 */
const getXPMultiplier = async (user) => {
  const SubscriptionTier = require("../models/SubscriptionTier");
  if (!user.subscriptionTier || user.subscriptionTier === "Free") {
    return 1.0;
  }
  // Check if subscription has expired
  if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
    return 1.0;
  }
  // Fetch tier details
  const tier = await SubscriptionTier.findOne({ name: user.subscriptionTier });
  return tier && tier.features ? (tier.features.bonusXPMultiplier || 1.0) : 1.0;
};

/**
 * Publish XP update to Redis Pub/Sub for real-time Socket.IO broadcasts
 */
const publishXPUpdate = async (user, amount, reason) => {
  if (isRedisReady()) {
    try {
      await redisClient.publish(
        "leaderboard:update",
        JSON.stringify({
          userId: user._id.toString(),
          name: user.name,
          xp: user.xp,
          level: user.level,
          gained: amount,
          reason: reason,
        })
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to publish XP update to Redis:", err.message);
    }
  }
};

/**
 * Helper: Find or create UserProgress. Automatically unlocks the first lesson.
 */
const getOrCreateProgress = async (userId) => {
  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    // Find the first published lesson (oldest by createdAt)
    const firstLesson = await Lesson.findOne({ status: "Published" }).sort({
      createdAt: 1,
    });

    const unlockedLessons = firstLesson ? [firstLesson._id] : [];

    progress = await UserProgress.create({
      userId,
      completedLessons: [],
      completedPodcasts: [],
      quizPerformances: [],
      unlockedLessons,
    });
  }
  return progress;
};

// ─── GET /api/progress/dashboard ───────────────────────────────────────
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const progress = await getOrCreateProgress(userId);

  // Fetch XP History
  const xpHistory = await XPHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30);

  // Count total published items for statistics
  const totalLessons = await Lesson.countDocuments({ status: "Published" });
  const totalPodcasts = await Podcast.countDocuments({ status: "Published" });

  res.status(200).json({
    success: true,
    data: {
      xp: req.user.xp,
      level: req.user.level,
      completedLessons: progress.completedLessons,
      completedPodcasts: progress.completedPodcasts,
      quizPerformances: progress.quizPerformances,
      unlockedLessons: progress.unlockedLessons,
      xpHistory,
      stats: {
        totalLessons,
        totalPodcasts,
        completedLessonsCount: progress.completedLessons.length,
        completedPodcastsCount: progress.completedPodcasts.length,
      },
    },
  });
});

// ─── POST /api/progress/lesson/:id/complete ───────────────────────────
const completeLesson = asyncHandler(async (req, res) => {
  const { id: lessonId } = req.params;
  const userId = req.user._id;

  // Check lesson exists
  const lesson = await Lesson.findOne({ _id: lessonId, status: "Published" });
  if (!lesson) {
    throw new AppError("Published lesson not found", 404);
  }

  const progress = await getOrCreateProgress(userId);

  // Check if already completed
  const isCompleted = progress.completedLessons.some(
    (id) => id.toString() === lessonId
  );

  if (isCompleted) {
    return res.status(200).json({
      success: true,
      message: "Lesson already completed",
      data: {
        xp: req.user.xp,
        level: req.user.level,
      },
    });
  }

  // Mark as completed
  progress.completedLessons.push(lessonId);

  // Award XP
  const multiplier = await getXPMultiplier(req.user);
  const xpGained = Math.round(XP_LESSON * multiplier);
  const oldXP = req.user.xp || 0;
  const newXP = oldXP + xpGained;
  const newLevel = calculateLevel(newXP);

  // Update user
  const user = await User.findById(userId);
  user.xp = newXP;
  user.level = newLevel;
  await user.save();

  // Log to history
  const description = `Hoàn thành bài học: ${lesson.title}${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;
  await XPHistory.create({
    userId,
    amount: xpGained,
    source: "Lesson",
    sourceId: lessonId,
    description,
  });

  // Unlock next lesson
  const allLessons = await Lesson.find({ status: "Published" }).sort({
    createdAt: 1,
  });
  const currentIndex = allLessons.findIndex(
    (l) => l._id.toString() === lessonId
  );

  if (currentIndex !== -1 && currentIndex + 1 < allLessons.length) {
    const nextLesson = allLessons[currentIndex + 1];
    const isUnlocked = progress.unlockedLessons.some(
      (id) => id.toString() === nextLesson._id.toString()
    );
    if (!isUnlocked) {
      progress.unlockedLessons.push(nextLesson._id);
    }
  }

  await progress.save();

  // Broadcast real-time XP and leaderboard update
  await publishXPUpdate(user, xpGained, description);

  res.status(200).json({
    success: true,
    message: "Lesson completed successfully",
    data: {
      xp: user.xp,
      level: user.level,
      xpGained,
    },
  });
});

// ─── POST /api/progress/podcast/:id/complete ──────────────────────────
const completePodcast = asyncHandler(async (req, res) => {
  const { id: podcastId } = req.params;
  const userId = req.user._id;

  // Check podcast exists
  const podcast = await Podcast.findOne({ _id: podcastId, status: "Published" });
  if (!podcast) {
    throw new AppError("Published podcast not found", 404);
  }

  const progress = await getOrCreateProgress(userId);

  // Check if already completed
  const isCompleted = progress.completedPodcasts.some(
    (id) => id.toString() === podcastId
  );

  if (isCompleted) {
    return res.status(200).json({
      success: true,
      message: "Podcast already completed",
      data: {
        xp: req.user.xp,
        level: req.user.level,
      },
    });
  }

  // Mark completed
  progress.completedPodcasts.push(podcastId);
  await progress.save();

  // Award XP
  const multiplier = await getXPMultiplier(req.user);
  const xpGained = Math.round(XP_PODCAST * multiplier);
  const oldXP = req.user.xp || 0;
  const newXP = oldXP + xpGained;
  const newLevel = calculateLevel(newXP);

  // Update user
  const user = await User.findById(userId);
  user.xp = newXP;
  user.level = newLevel;
  await user.save();

  // Log to history
  const description = `Nghe xong podcast: ${podcast.title}${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;
  await XPHistory.create({
    userId,
    amount: xpGained,
    source: "Podcast",
    sourceId: podcastId,
    description,
  });

  // Broadcast real-time update
  await publishXPUpdate(user, xpGained, description);

  res.status(200).json({
    success: true,
    message: "Podcast completed successfully",
    data: {
      xp: user.xp,
      level: user.level,
      xpGained,
    },
  });
});

// ─── POST /api/progress/quiz/:id/submit ──────────────────────────────
const submitQuiz = asyncHandler(async (req, res) => {
  const { id: lessonId } = req.params;
  const { score, total } = req.body;
  const userId = req.user._id;

  if (typeof score !== "number" || typeof total !== "number" || total <= 0) {
    throw new AppError("Invalid score or total questions count", 400);
  }

  // Check lesson exists
  const lesson = await Lesson.findOne({ _id: lessonId, status: "Published" });
  if (!lesson) {
    throw new AppError("Published lesson not found", 404);
  }

  const passed = score >= Math.ceil(total / 2); // 50% or more to pass

  const progress = await getOrCreateProgress(userId);

  // Find if this quiz was already submitted
  const existingPerformanceIndex = progress.quizPerformances.findIndex(
    (qp) => qp.lessonId.toString() === lessonId
  );

  let xpToAward = 0;
  let statusReason = "";

  const multiplier = await getXPMultiplier(req.user);

  if (existingPerformanceIndex === -1) {
    // First time submitting this quiz
    const baseXP = passed ? XP_QUIZ_PASS : XP_QUIZ_FAIL;
    xpToAward = Math.round(baseXP * multiplier);
    statusReason = passed
      ? `Đạt Quiz bài học: ${lesson.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`
      : `Hoàn thành Quiz bài học: ${lesson.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;

    progress.quizPerformances.push({
      lessonId,
      score,
      total,
      passed,
      updatedAt: new Date(),
    });
  } else {
    // Re-taking the quiz
    const previousPerformance = progress.quizPerformances[existingPerformanceIndex];

    if (!previousPerformance.passed && passed) {
      // Failed previously, but now passed -> award difference (150 - 50 = 100 XP)
      const baseXP = XP_QUIZ_PASS - XP_QUIZ_FAIL;
      xpToAward = Math.round(baseXP * multiplier);
      statusReason = `Thi lại đạt Quiz bài học: ${lesson.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;

      // Update record
      previousPerformance.score = score;
      previousPerformance.total = total;
      previousPerformance.passed = passed;
      previousPerformance.updatedAt = new Date();
    } else {
      // Already passed, or failed again -> no additional XP
      statusReason = `Làm lại Quiz bài học: ${lesson.title} (${score}/${total})`;

      // Update score if it's higher
      if (score > previousPerformance.score) {
        previousPerformance.score = score;
        previousPerformance.total = total;
        previousPerformance.updatedAt = new Date();
      }
    }
  }

  await progress.save();

  let user = await User.findById(userId);

  if (xpToAward > 0) {
    const oldXP = user.xp || 0;
    const newXP = oldXP + xpToAward;
    const newLevel = calculateLevel(newXP);

    user.xp = newXP;
    user.level = newLevel;
    await user.save();

    // Log to history
    await XPHistory.create({
      userId,
      amount: xpToAward,
      source: "Quiz",
      sourceId: lessonId,
      description: statusReason,
    });

    // Broadcast update
    await publishXPUpdate(user, xpToAward, statusReason);
  }

  res.status(200).json({
    success: true,
    message: "Quiz submitted successfully",
    data: {
      xp: user.xp,
      level: user.level,
      xpGained: xpToAward,
      passed,
    },
  });
});

// ─── GET /api/progress/leaderboard ────────────────────────────────────
const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;
  const skip = (page - 1) * limit;

  // Retrieve leaderboard sorted by XP desc
  const leaderboard = await User.find({ role: "student", isLocked: { $ne: true } })
    .select("name avatar xp level")
    .sort({ xp: -1, createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments({ role: "student", isLocked: { $ne: true } });

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

module.exports = {
  getDashboard,
  completeLesson,
  completePodcast,
  submitQuiz,
  getLeaderboard,
};
