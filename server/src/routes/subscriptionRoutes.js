const express = require("express");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/auth");
const { requireTier } = require("../middleware/subscription");
const {
  getTiers,
  getMySubscription,
  purchase,
  purchaseGift,
  redeem,
  validateCoupon,
  getTransactions,
  verifyRecipient,
  getGiftCodeInfo,
  createLessonRequest,
  getMyLessonRequests,
  getTeacherLessonRequests,
  acceptLessonRequest,
  rejectLessonRequest,
  createCoupon,
  getCoupons,
  deleteCoupon,
  getTransactionStatus,
  sepayWebhook,
  getAdminDashboardStats,
  getUserTransactionsForAdmin,
  updateTierPrice,
} = require("../controllers/subscriptionController");

const router = express.Router();

// Public
router.get("/tiers", getTiers);
router.post("/sepay-webhook", sepayWebhook);

// Authenticated
router.use(protect);
router.get("/my", getMySubscription);
router.post("/purchase", purchase);
router.post("/gift", purchaseGift);
router.post("/redeem", redeem);
router.post("/validate-coupon", validateCoupon);
router.get("/transactions", getTransactions);
router.get("/transactions/:id/status", getTransactionStatus);
router.post("/verify-recipient", verifyRecipient);
router.get("/gift-code/:code", getGiftCodeInfo);

// Lesson Requests (Student Pro)
router.post("/lesson-requests", requireTier("Student Pro"), createLessonRequest);
router.get("/lesson-requests", getMyLessonRequests);

// Teacher
router.get("/lesson-requests/teacher", authorize("teacher"), getTeacherLessonRequests);
router.put("/lesson-requests/:id/accept", authorize("teacher"), acceptLessonRequest);
router.put("/lesson-requests/:id/reject", authorize("teacher"), rejectLessonRequest);

// Admin: Coupons & Dashboard Stats & Tiers
router.post("/coupons", authorize("admin"), createCoupon);
router.get("/coupons", authorize("admin"), getCoupons);
router.delete("/coupons/:id", authorize("admin"), deleteCoupon);
router.get("/admin/dashboard-stats", authorize("admin"), getAdminDashboardStats);
router.get("/admin/users/:id/transactions", authorize("admin"), getUserTransactionsForAdmin);
router.put("/admin/tiers/:id/price", authorize("admin"), updateTierPrice);

module.exports = router;
