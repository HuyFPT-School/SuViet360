const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");
const { protect, authorize } = require("../middleware/auth");
const {
  getAllChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  getAllStudyUnits,
  getStudyUnitsByChapter,
  getStudyUnitById,
  createStudyUnit,
  updateStudyUnit,
  deleteStudyUnit,
  submitStudyUnitForReview,
  approveStudyUnit,
  rejectStudyUnit,
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  approveQuiz,
  rejectQuiz,
} = require("../controllers/curriculumController");

const router = express.Router();

// Helper for optional authentication
const optionalProtect = async (req, res, next) => {
  let token = getCookie(req, "token");

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (user && user.isEmailVerified) {
      req.user = user;
    }
  } catch (err) {
    // Fail silently for optional check
  }
  next();
};

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/chapters", getAllChapters);
router.get("/chapters/:id", getChapterById);
router.get("/chapters/:chapterId/units", optionalProtect, getStudyUnitsByChapter);

router.get("/units", getAllStudyUnits);
router.get("/units/:id", optionalProtect, getStudyUnitById);

router.get("/quizzes/:id", optionalProtect, getQuizById);

// ==========================================
// USER PROGRESS ROUTES
// ==========================================
const {
  getStudyUnitProgress,
  completeStudyUnit,
  submitCurriculumQuiz,
} = require("../controllers/curriculumController");

router.get("/progress/:unitId", protect, getStudyUnitProgress);
router.post("/progress/:unitId/complete", protect, completeStudyUnit);
router.post("/progress/:unitId/quiz-submit", protect, submitCurriculumQuiz);

// ==========================================
// TEACHER & ADMIN MODERATION ROUTES
// ==========================================
router.put("/units/:id/submit", protect, authorize("admin", "staff", "teacher"), submitStudyUnitForReview);
router.put("/units/:id/approve", protect, authorize("admin", "teacher"), approveStudyUnit);
router.put("/units/:id/reject", protect, authorize("admin", "teacher"), rejectStudyUnit);
router.put("/quizzes/:id/approve", protect, authorize("admin", "teacher"), approveQuiz);
router.put("/quizzes/:id/reject", protect, authorize("admin", "teacher"), rejectQuiz);
router.get("/quizzes", protect, authorize("admin", "staff", "teacher"), getAllQuizzes);

// ==========================================
// ADMIN & STAFF WRITE ROUTES (CHAPTERS / UNITS / QUIZZES)
// ==========================================
router.use(protect, authorize("admin", "staff"));

router.post("/chapters", createChapter);
router.put("/chapters/:id", updateChapter);
router.delete("/chapters/:id", deleteChapter);

router.post("/units", createStudyUnit);
router.put("/units/:id", updateStudyUnit);
router.delete("/units/:id", deleteStudyUnit);

router.post("/quizzes", createQuiz);
router.put("/quizzes/:id", updateQuiz);
router.delete("/quizzes/:id", deleteQuiz);

module.exports = router;
