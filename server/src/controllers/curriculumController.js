const Chapter = require("../models/Chapter");
const StudyUnit = require("../models/StudyUnit");
const Quiz = require("../models/Quiz");

// ==========================================
// CHAPTER CONTROLLERS
// ==========================================

exports.getAllChapters = async (req, res, next) => {
  try {
    const { grade } = req.query;
    const filter = {};
    if (grade) {
      filter.grade = Number(grade);
    }
    
    // Sort by grade first, then order
    const chapters = await Chapter.find(filter).sort({ grade: 1, order: 1 });
    
    res.status(200).json({
      status: "success",
      results: chapters.length,
      data: { chapters },
    });
  } catch (err) {
    next(err);
  }
};

exports.getChapterById = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ status: "fail", message: "Chapter not found" });
    }
    res.status(200).json({
      status: "success",
      data: { chapter },
    });
  } catch (err) {
    next(err);
  }
};

exports.createChapter = async (req, res, next) => {
  try {
    const { title, description, grade, order, coverImage, status } = req.body;
    const newChapter = await Chapter.create({
      title,
      description,
      grade,
      order,
      coverImage,
      status,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      status: "success",
      data: { chapter: newChapter },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateChapter = async (req, res, next) => {
  try {
    const updatedChapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedChapter) {
      return res.status(404).json({ status: "fail", message: "Chapter not found" });
    }

    res.status(200).json({
      status: "success",
      data: { chapter: updatedChapter },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteChapter = async (req, res, next) => {
  try {
    // Check if chapter has any study units
    const unitsCount = await StudyUnit.countDocuments({ chapterId: req.params.id });
    if (unitsCount > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Không thể xóa chương này vì chương đang chứa các bài học lý thuyết. Hãy xóa các bài học trước.",
      });
    }

    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) {
      return res.status(404).json({ status: "fail", message: "Chapter not found" });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// STUDY UNIT CONTROLLERS
// ==========================================

exports.getAllStudyUnits = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const units = await StudyUnit.find(filter).populate("chapterId", "title grade").populate("createdBy", "name email").sort({ order: 1 });
    res.status(200).json({
      status: "success",
      results: units.length,
      data: { units },
    });
  } catch (err) {
    next(err);
  }
};

exports.getStudyUnitsByChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    // Standard query filters out unpublished units for students
    const filter = { chapterId };
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff" && req.user.role !== "teacher")) {
      filter.status = "Published";
    }

    const units = await StudyUnit.find(filter).populate("chapterId", "title grade").populate("createdBy", "name email").sort({ order: 1 });
    res.status(200).json({
      status: "success",
      results: units.length,
      data: { units },
    });
  } catch (err) {
    next(err);
  }
};

exports.getStudyUnitById = async (req, res, next) => {
  try {
    const unit = await StudyUnit.findById(req.params.id)
      .populate("chapterId")
      .populate("createdBy", "name email");
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }

    // Hide if not published and requestor is a student
    const isStaff = req.user && ["admin", "staff", "teacher"].includes(req.user.role);
    if (unit.status !== "Published" && !isStaff) {
      return res.status(403).json({ status: "fail", message: "You do not have permission to view this draft unit." });
    }

    res.status(200).json({
      status: "success",
      data: { unit },
    });
  } catch (err) {
    next(err);
  }
};

exports.createStudyUnit = async (req, res, next) => {
  try {
    const { title, summary, chapterId, order, duration, difficulty, tags, thumbnail, contentBlocks } = req.body;

    const newUnit = await StudyUnit.create({
      title,
      summary,
      chapterId,
      order,
      duration,
      difficulty,
      tags,
      thumbnail,
      contentBlocks,
      status: "Pending_Review",
      createdBy: req.user?._id,
    });

    res.status(201).json({
      status: "success",
      data: { unit: newUnit },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateStudyUnit = async (req, res, next) => {
  try {
    const unit = await StudyUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }

    const { title, summary, chapterId, order, duration, difficulty, tags, thumbnail, contentBlocks } = req.body;

    if (unit.status === "Published") {
      unit.pendingDraft = {
        title,
        summary,
        chapterId,
        order,
        duration,
        difficulty,
        tags,
        thumbnail,
        contentBlocks,
        updatedAt: new Date(),
      };
      unit.markModified("pendingDraft");
      await unit.save();
    } else {
      if (title !== undefined) unit.title = title;
      if (summary !== undefined) unit.summary = summary;
      if (chapterId !== undefined) unit.chapterId = chapterId;
      if (order !== undefined) unit.order = order;
      if (duration !== undefined) unit.duration = duration;
      if (difficulty !== undefined) unit.difficulty = difficulty;
      if (tags !== undefined) unit.tags = tags;
      if (thumbnail !== undefined) unit.thumbnail = thumbnail;
      if (contentBlocks !== undefined) unit.contentBlocks = contentBlocks;
      
      unit.status = "Pending_Review";
      unit.reviewFeedback = "";
      await unit.save();
    }

    res.status(200).json({
      status: "success",
      data: { unit },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteStudyUnit = async (req, res, next) => {
  try {
    const unit = await StudyUnit.findByIdAndDelete(req.params.id);
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// Approval / Moderation Flow
exports.submitStudyUnitForReview = async (req, res, next) => {
  try {
    const unit = await StudyUnit.findByIdAndUpdate(
      req.params.id,
      { status: "Pending_Review" },
      { new: true }
    );
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }
    res.status(200).json({ status: "success", data: { unit } });
  } catch (err) {
    next(err);
  }
};

exports.approveStudyUnit = async (req, res, next) => {
  try {
    const unit = await StudyUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }

    if (unit.pendingDraft) {
      const draft = unit.pendingDraft;
      if (draft.title !== undefined) unit.title = draft.title;
      if (draft.summary !== undefined) unit.summary = draft.summary;
      if (draft.chapterId !== undefined) unit.chapterId = draft.chapterId;
      if (draft.order !== undefined) unit.order = draft.order;
      if (draft.duration !== undefined) unit.duration = draft.duration;
      if (draft.difficulty !== undefined) unit.difficulty = draft.difficulty;
      if (draft.tags !== undefined) unit.tags = draft.tags;
      if (draft.thumbnail !== undefined) unit.thumbnail = draft.thumbnail;
      if (draft.contentBlocks !== undefined) unit.contentBlocks = draft.contentBlocks;
      
      unit.pendingDraft = null;
      unit.markModified("pendingDraft");
    }

    unit.status = "Published";
    unit.reviewFeedback = "";
    await unit.save();

    res.status(200).json({ status: "success", data: { unit } });
  } catch (err) {
    next(err);
  }
};

exports.rejectStudyUnit = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: "fail", message: "Feedback is required when rejecting." });
    }

    const unit = await StudyUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }

    if (unit.pendingDraft) {
      unit.pendingDraft = null;
      unit.markModified("pendingDraft");
    } else {
      unit.status = "Rejected";
    }

    unit.reviewFeedback = feedback.trim();
    await unit.save();

    res.status(200).json({ status: "success", data: { unit } });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// QUIZ CONTROLLERS
// ==========================================

exports.getAllQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find().populate("createdBy", "name email").sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      results: quizzes.length,
      data: { quizzes },
    });
  } catch (err) {
    next(err);
  }
};

exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("createdBy", "name email");
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }

    const isStaff = req.user && ["admin", "staff", "teacher"].includes(req.user.role);

    // If requestor is a student, strip correctIndex for security
    if (!isStaff) {
      const sanitizedQuestions = quiz.questions.map((q) => {
        const questionObj = q.toObject ? q.toObject() : { ...q };
        delete questionObj.correctIndex;
        return questionObj;
      });
      
      const sanitizedQuiz = quiz.toObject();
      sanitizedQuiz.questions = sanitizedQuestions;
      
      return res.status(200).json({
        status: "success",
        data: { quiz: sanitizedQuiz },
      });
    }

    res.status(200).json({
      status: "success",
      data: { quiz },
    });
  } catch (err) {
    next(err);
  }
};

exports.createQuiz = async (req, res, next) => {
  try {
    const { title, description, timeLimit, passScore, shuffleQuestions, questions } = req.body;
    const newQuiz = await Quiz.create({
      title,
      description,
      timeLimit,
      passScore,
      shuffleQuestions,
      status: "Pending_Review",
      questions,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      status: "success",
      data: { quiz: newQuiz },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }

    const { title, description, timeLimit, passScore, shuffleQuestions, questions } = req.body;

    if (quiz.status === "Published") {
      quiz.pendingDraft = {
        title,
        description,
        timeLimit,
        passScore,
        shuffleQuestions,
        questions,
        updatedAt: new Date(),
      };
      quiz.markModified("pendingDraft");
      await quiz.save();
    } else {
      if (title !== undefined) quiz.title = title;
      if (description !== undefined) quiz.description = description;
      if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
      if (passScore !== undefined) quiz.passScore = passScore;
      if (shuffleQuestions !== undefined) quiz.shuffleQuestions = shuffleQuestions;
      if (questions !== undefined) quiz.questions = questions;
      
      quiz.status = "Pending_Review";
      quiz.reviewFeedback = "";
      await quiz.save();
    }

    res.status(200).json({
      status: "success",
      data: { quiz },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.approveQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }

    if (quiz.pendingDraft) {
      const draft = quiz.pendingDraft;
      if (draft.title !== undefined) quiz.title = draft.title;
      if (draft.description !== undefined) quiz.description = draft.description;
      if (draft.timeLimit !== undefined) quiz.timeLimit = draft.timeLimit;
      if (draft.passScore !== undefined) quiz.passScore = draft.passScore;
      if (draft.shuffleQuestions !== undefined) quiz.shuffleQuestions = draft.shuffleQuestions;
      if (draft.questions !== undefined) quiz.questions = draft.questions;
      
      quiz.pendingDraft = null;
      quiz.markModified("pendingDraft");
    }

    quiz.status = "Published";
    quiz.reviewFeedback = "";
    await quiz.save();

    res.status(200).json({ status: "success", data: { quiz } });
  } catch (err) {
    next(err);
  }
};

exports.rejectQuiz = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: "fail", message: "Feedback is required when rejecting." });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }

    if (quiz.pendingDraft) {
      quiz.pendingDraft = null;
      quiz.markModified("pendingDraft");
    } else {
      quiz.status = "Rejected";
    }

    quiz.reviewFeedback = feedback.trim();
    await quiz.save();

    res.status(200).json({ status: "success", data: { quiz } });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// STUDY UNIT PROGRESS CONTROLLERS
// ==========================================

const UserProgress = require("../models/UserProgress");
const XPHistory = require("../models/XPHistory");
const User = require("../models/User");
const { redisClient, isRedisReady } = require("../config/redis");

const getXPMultiplier = async (user) => {
  const SubscriptionTier = require("../models/SubscriptionTier");
  if (!user.subscriptionTier || user.subscriptionTier === "Free") {
    return 1.0;
  }
  if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
    return 1.0;
  }
  const tier = await SubscriptionTier.findOne({ name: user.subscriptionTier });
  return tier && tier.features ? (tier.features.bonusXPMultiplier || 1.0) : 1.0;
};

const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

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
      console.error("Failed to publish XP update to Redis:", err.message);
    }
  }
};

const getOrCreateProgress = async (userId) => {
  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({
      userId,
      completedLessons: [],
      completedPodcasts: [],
      completedUnits: [],
      quizPerformances: [],
      unlockedLessons: [],
    });
  }
  return progress;
};

exports.getStudyUnitProgress = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const userId = req.user._id;

    const progress = await getOrCreateProgress(userId);
    const completed = progress.completedUnits.some(
      (id) => id.toString() === unitId
    );

    const unit = await StudyUnit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Study unit not found" });
    }

    const quizBlock = unit.contentBlocks.find((b) => b.type === "quiz");
    let quizPerformance = null;
    if (quizBlock && quizBlock.data && quizBlock.data.quizId) {
      quizPerformance = progress.quizPerformances.find(
        (qp) => qp.quizId && qp.quizId.toString() === quizBlock.data.quizId.toString()
      ) || null;
    }

    res.status(200).json({
      status: "success",
      data: {
        completed,
        quizPerformance,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.completeStudyUnit = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const userId = req.user._id;

    const unit = await StudyUnit.findOne({ _id: unitId, status: "Published" });
    if (!unit) {
      return res.status(404).json({ status: "fail", message: "Published study unit not found" });
    }

    const progress = await getOrCreateProgress(userId);
    const isCompleted = progress.completedUnits.some(
      (id) => id.toString() === unitId
    );

    if (isCompleted) {
      return res.status(200).json({
        status: "success",
        message: "Study unit already completed",
        data: {
          xp: req.user.xp,
          level: req.user.level,
        },
      });
    }

    progress.completedUnits.push(unitId);
    await progress.save();

    const multiplier = await getXPMultiplier(req.user);
    const xpGained = Math.round(100 * multiplier);
    const oldXP = req.user.xp || 0;
    const newXP = oldXP + xpGained;
    const newLevel = calculateLevel(newXP);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { xp: xpGained },
        $set: { level: newLevel },
      },
      { new: true }
    );

    const description = `Hoàn thành bài học lý thuyết: ${unit.title}${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;
    await XPHistory.create({
      userId,
      amount: xpGained,
      source: "StudyUnit",
      sourceId: unitId,
      description,
    });

    await publishXPUpdate(user, xpGained, description);

    res.status(200).json({
      status: "success",
      message: "Study unit completed successfully",
      data: {
        xp: user.xp,
        level: user.level,
        xpGained,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.submitCurriculumQuiz = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    let { quizId, score, total, answers } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ status: "fail", message: "Quiz not found" });
    }

    if (answers && Array.isArray(answers)) {
      total = quiz.questions.length;
      score = 0;
      answers.forEach((ansIdx, qIdx) => {
        if (quiz.questions[qIdx] && quiz.questions[qIdx].correctIndex === ansIdx) {
          score++;
        }
      });
    }

    if (typeof score !== "number" || typeof total !== "number" || total <= 0) {
      return res.status(400).json({ status: "fail", message: "Invalid score or total" });
    }

    const passScore = quiz.passScore || 60;
    const passed = score >= Math.ceil(total * passScore / 100);

    const progress = await getOrCreateProgress(userId);

    const existingIndex = progress.quizPerformances.findIndex(
      (qp) => qp.quizId && qp.quizId.toString() === quizId
    );

    let xpToAward = 0;
    let reason = "";
    const multiplier = await getXPMultiplier(req.user);

    if (existingIndex === -1) {
      const baseXP = passed ? 150 : 50;
      xpToAward = Math.round(baseXP * multiplier);
      reason = passed
        ? `Đạt Quiz trắc nghiệm: ${quiz.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`
        : `Làm Quiz trắc nghiệm: ${quiz.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;

      progress.quizPerformances.push({
        quizId,
        score,
        total,
        passed,
        updatedAt: new Date(),
      });
    } else {
      const prev = progress.quizPerformances[existingIndex];
      if (!prev.passed && passed) {
        xpToAward = Math.round(100 * multiplier);
        reason = `Thi lại đạt Quiz trắc nghiệm: ${quiz.title} (${score}/${total})${multiplier > 1.0 ? ` (VIP x${multiplier} Bonus)` : ""}`;
        
        prev.score = score;
        prev.total = total;
        prev.passed = passed;
        prev.updatedAt = new Date();
      } else {
        reason = `Làm lại Quiz trắc nghiệm: ${quiz.title} (${score}/${total})`;
        if (score > prev.score) {
          prev.score = score;
          prev.total = total;
          prev.updatedAt = new Date();
        }
      }
    }

    await progress.save();

    let user = await User.findById(userId);
    if (xpToAward > 0) {
      const oldXP = user.xp || 0;
      const newXP = oldXP + xpToAward;
      const newLevel = calculateLevel(newXP);

      user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { xp: xpToAward },
          $set: { level: newLevel },
        },
        { new: true }
      );

      await XPHistory.create({
        userId,
        amount: xpToAward,
        source: "Quiz",
        sourceId: quizId,
        description: reason,
      });

      await publishXPUpdate(user, xpToAward, reason);
    }

    res.status(200).json({
      status: "success",
      message: "Quiz submitted successfully",
      data: {
        xp: user.xp,
        level: user.level,
        xpGained: xpToAward,
        passed,
        correctIndices: quiz.questions.map((q) => q.correctIndex),
      },
    });
  } catch (err) {
    next(err);
  }
};
