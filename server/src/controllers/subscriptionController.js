const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const subscriptionService = require("../services/subscriptionService");
const LessonRequest = require("../models/LessonRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const GiftCode = require("../models/GiftCode");
const Coupon = require("../models/Coupon");
const Transaction = require("../models/Transaction");

// GET /api/subscriptions/tiers
const getTiers = asyncHandler(async (req, res) => {
  const tiers = await subscriptionService.getActiveTiers();
  res.status(200).json({ success: true, data: tiers });
});

// GET /api/subscriptions/my
const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getUserSubscription(req.user._id);
  res.status(200).json({
    success: true,
    data: {
      subscription,
      tier: req.user.subscriptionTier || "Free",
      expiry: req.user.subscriptionExpiry,
    },
  });
});

// POST /api/subscriptions/purchase
const purchase = asyncHandler(async (req, res) => {
  const { tierId, billingCycle, couponCode, paymentMethod } = req.body;
  if (!tierId || !billingCycle) throw new AppError("Thiếu thông tin gói hoặc chu kỳ thanh toán", 400);

  const result = await subscriptionService.purchaseForSelf(req.user._id, tierId, billingCycle, couponCode, paymentMethod || "sepay");
  res.status(200).json({
    success: true,
    message: result.transaction.status === "Completed" ? "Mua gói thành công!" : "Yêu cầu thanh toán đã được tạo.",
    data: {
      ...result,
      bankInfo: {
        bin: env.bankBin,
        accountNumber: env.bankAccountNumber,
        accountName: env.bankAccountName,
      }
    },
  });
});

// POST /api/subscriptions/gift
const purchaseGift = asyncHandler(async (req, res) => {
  const { recipientIdentifier, tierId, billingCycle, giftMessage, mode, couponCode, paymentMethod } = req.body;
  if (!recipientIdentifier || !tierId || !billingCycle) {
    throw new AppError("Thiếu thông tin người nhận, gói, hoặc chu kỳ thanh toán", 400);
  }

  const result = await subscriptionService.purchaseGift(
    req.user._id,
    recipientIdentifier,
    tierId,
    billingCycle,
    giftMessage || "",
    mode || "code",
    couponCode || "",
    paymentMethod || "sepay"
  );

  res.status(200).json({
    success: true,
    message: result.transaction.status === "Completed"
      ? (mode === "instant" ? "Tặng quà thành công! Gói đã được kích hoạt cho người nhận." : "Tặng quà thành công! Mã quà tặng đã được tạo.")
      : "Yêu cầu thanh toán quà tặng đã được tạo.",
    data: {
      ...result,
      bankInfo: {
        bin: env.bankBin,
        accountNumber: env.bankAccountNumber,
        accountName: env.bankAccountName,
      }
    },
  });
});

// POST /api/subscriptions/redeem
const redeem = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new AppError("Vui lòng nhập mã quà tặng", 400);

  const result = await subscriptionService.redeemGiftCode(req.user._id, code);
  res.status(200).json({
    success: true,
    message: "Kích hoạt mã quà tặng thành công!",
    data: result,
  });
});

// POST /api/subscriptions/validate-coupon
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, tierId, amount } = req.body;
  if (!code || !tierId || !amount) throw new AppError("Thiếu thông tin mã giảm giá", 400);

  const result = await subscriptionService.validateCoupon(code, tierId, amount);
  res.status(200).json({
    success: true,
    data: {
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      discount: result.discount,
      description: result.coupon.description,
    },
  });
});

// GET /api/subscriptions/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await subscriptionService.getTransactionHistory(req.user._id);
  res.status(200).json({ success: true, data: transactions });
});

// POST /api/subscriptions/verify-recipient
const verifyRecipient = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) throw new AppError("Vui lòng nhập email hoặc tên người nhận", 400);

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { name: identifier },
    ],
    role: "student",
  }).select("name email avatar");

  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError("Bạn không thể tặng quà cho chính mình", 400);
  }

  res.status(200).json({ success: true, data: user });
});

// GET /api/subscriptions/gift-code/:code
const getGiftCodeInfo = asyncHandler(async (req, res) => {
  const giftCode = await GiftCode.findOne({ code: req.params.code.toUpperCase() })
    .populate("tierId", "name slug features")
    .populate("senderId", "name avatar");

  if (!giftCode) throw new AppError("Mã quà tặng không hợp lệ", 404);

  res.status(200).json({
    success: true,
    data: {
      code: giftCode.code,
      tier: giftCode.tierId,
      sender: giftCode.senderId,
      billingCycle: giftCode.billingCycle,
      giftMessage: giftCode.giftMessage,
      status: giftCode.status,
      expiresAt: giftCode.expiresAt,
    },
  });
});

// ─── Lesson Requests (Student Pro only) ────────────────────────────────

// POST /api/subscriptions/lesson-requests
const createLessonRequest = asyncHandler(async (req, res) => {
  const { title, description, historicalPeriod } = req.body;
  if (!title || !description) throw new AppError("Tiêu đề và mô tả là bắt buộc", 400);

  const request = await LessonRequest.create({
    requesterId: req.user._id,
    title,
    description,
    historicalPeriod: historicalPeriod || "",
  });

  // Notify ALL teachers
  const teachers = await User.find({ role: "teacher" }).select("_id");
  const notifications = teachers.map((teacher) => ({
    recipient: teacher._id,
    type: "Lesson_Request_New",
    title: "Yêu cầu bài học mới từ học sinh Pro",
    message: `${req.user.name} yêu cầu bài học: "${title}"`,
    link: "/teacher?tab=requests",
  }));
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  res.status(201).json({ success: true, data: request });
});

// GET /api/subscriptions/lesson-requests
const getMyLessonRequests = asyncHandler(async (req, res) => {
  const requests = await LessonRequest.find({ requesterId: req.user._id })
    .populate("assignedTeacherId", "name avatar")
    .populate("resultLessonId", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// GET /api/subscriptions/lesson-requests/teacher (for teachers)
const getTeacherLessonRequests = asyncHandler(async (req, res) => {
  const requests = await LessonRequest.find({
    $or: [
      { status: "Pending" },
      { assignedTeacherId: req.user._id },
    ],
  })
    .populate("requesterId", "name avatar email")
    .populate("assignedTeacherId", "name avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// PUT /api/subscriptions/lesson-requests/:id/accept
const acceptLessonRequest = asyncHandler(async (req, res) => {
  const request = await LessonRequest.findById(req.params.id);
  if (!request) throw new AppError("Yêu cầu không tồn tại", 404);
  if (request.status !== "Pending") throw new AppError("Yêu cầu đã được xử lý", 400);

  request.status = "Accepted";
  request.assignedTeacherId = req.user._id;
  await request.save();

  // Notify requester
  await Notification.create({
    recipient: request.requesterId,
    type: "Lesson_Request_Accepted",
    title: "Yêu cầu bài học đã được chấp nhận!",
    message: `Giáo viên ${req.user.name} đã nhận yêu cầu bài học "${request.title}" của bạn.`,
    link: "/subscription?tab=requests",
  });

  res.status(200).json({ success: true, data: request });
});

// PUT /api/subscriptions/lesson-requests/:id/reject
const rejectLessonRequest = asyncHandler(async (req, res) => {
  const request = await LessonRequest.findById(req.params.id);
  if (!request) throw new AppError("Yêu cầu không tồn tại", 404);
  if (request.status !== "Pending") throw new AppError("Yêu cầu đã được xử lý", 400);

  request.status = "Rejected";
  request.teacherResponse = req.body.reason || "";
  await request.save();

  await Notification.create({
    recipient: request.requesterId,
    type: "Lesson_Request_Rejected",
    title: "Yêu cầu bài học bị từ chối",
    message: `Yêu cầu bài học "${request.title}" đã bị từ chối.${req.body.reason ? " Lý do: " + req.body.reason : ""}`,
    link: "/subscription?tab=requests",
  });

  res.status(200).json({ success: true, data: request });
});

// ─── Admin: Coupon Management ──────────────────────────────────────────

// POST /api/subscriptions/coupons (Admin only)
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, maxUses, minPurchaseAmount, applicableTiers, endDate, description } = req.body;
  if (!code || !discountType || !discountValue || !endDate) {
    throw new AppError("Thiếu thông tin mã giảm giá", 400);
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    maxUses: maxUses || -1,
    minPurchaseAmount: minPurchaseAmount || 0,
    applicableTiers: applicableTiers || [],
    endDate: new Date(endDate),
    description: description || "",
  });

  res.status(201).json({ success: true, data: coupon });
});

// GET /api/subscriptions/coupons (Admin only)
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: coupons });
});

// DELETE /api/subscriptions/coupons/:id (Admin only)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError("Mã giảm giá không tồn tại", 404);
  res.status(200).json({ success: true, message: "Đã xóa mã giảm giá" });
});

// GET /api/subscriptions/transactions/:id/status
const getTransactionStatus = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) throw new AppError("Không tìm thấy giao dịch", 404);

  // Security check: only buyer or recipient can check status
  if (
    transaction.buyerId.toString() !== req.user._id.toString() &&
    transaction.recipientId.toString() !== req.user._id.toString()
  ) {
    throw new AppError("Bạn không có quyền truy cập thông tin giao dịch này", 403);
  }

  res.status(200).json({
    success: true,
    data: {
      status: transaction.status,
      transactionId: transaction.transactionId,
    },
  });
});

// POST /api/subscriptions/sepay-webhook
const sepayWebhook = asyncHandler(async (req, res) => {
  const env = require("../config/env");

  // Validate webhook secret token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Không có token xác thực webhook", 401);
  }
  const token = authHeader.split(" ")[1];
  if (token !== env.sepayWebhookToken) {
    throw new AppError("Token xác thực webhook không hợp lệ", 403);
  }

  const { content, transferAmount, code: gatewayRef } = req.body;
  if (!content || !transferAmount) {
    throw new AppError("Thiếu thông tin giao dịch từ webhook", 400);
  }

  // Find transaction code in the transfer description (e.g. TXN-20260703-ABCD)
  const match = content.match(/TXN-\d{8}-[0-9A-Z]{8}/i);
  if (!match) {
    console.log(`[SepayWebhook] Ignored payment. Description "${content}" does not contain a valid transaction ID.`);
    return res.status(200).json({ success: true, message: "Transaction ID not found in description" });
  }

  const transactionId = match[0].toUpperCase();
  const transaction = await Transaction.findOne({ transactionId });
  if (!transaction) {
    console.log(`[SepayWebhook] Transaction ${transactionId} not found in database.`);
    return res.status(200).json({ success: true, message: "Transaction not found" });
  }

  if (transaction.status === "Completed") {
    return res.status(200).json({ success: true, message: "Transaction already processed" });
  }

  if (transferAmount < transaction.amount) {
    console.log(`[SepayWebhook] Amount mismatch for ${transactionId}. Expected: ${transaction.amount}, Got: ${transferAmount}`);
    transaction.status = "Failed";
    transaction.metadata = { ...transaction.metadata, sepayError: "Amount mismatch", sepayPayload: req.body };
    await transaction.save();
    return res.status(200).json({ success: true, message: "Amount mismatch" });
  }

  const subscriptionService = require("../services/subscriptionService");
  const SubscriptionTier = require("../models/SubscriptionTier");

  transaction.status = "Completed";
  transaction.paymentMethod = "sepay";
  transaction.paymentGatewayRef = gatewayRef || "";
  transaction.metadata = { ...transaction.metadata, sepayPayload: req.body };
  await transaction.save();

  // Increment coupon usage if used
  if (transaction.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: transaction.couponCode },
      { $inc: { usedCount: 1 } }
    );
  }

  if (transaction.isGift) {
    // Generate code
    await GiftCode.create({
      transactionId: transaction._id,
      tierId: transaction.tierId,
      billingCycle: transaction.billingCycle,
      senderId: transaction.buyerId,
      recipientEmail: "",
      giftMessage: transaction.giftMessage,
    });

    // Notify buyer
    await Notification.create({
      recipient: transaction.buyerId,
      type: "System",
      title: "Mã quà tặng đã sẵn sàng! 🎁",
      message: `Thanh toán thành công gói tặng. Mã quà tặng đã được tạo cho bạn gửi đi.`,
      link: "/subscription",
    });
  } else {
    // Activate subscription
    await subscriptionService.activateSubscription(
      transaction.buyerId,
      transaction.tierId,
      transaction.billingCycle
    );

    // Notify buyer
    const tier = await SubscriptionTier.findById(transaction.tierId);
    await Notification.create({
      recipient: transaction.buyerId,
      type: "Subscription_Activated",
      title: "Nâng cấp tài khoản thành công! 💎",
      message: `Tài khoản của bạn đã được nâng cấp lên gói ${tier ? tier.name : "VIP"}.`,
      link: "/subscription",
    });
  }

  console.log(`[SepayWebhook] Processed successfully for transaction ${transactionId}`);
  res.status(200).json({ success: true, message: "Processed successfully" });
});

module.exports = {
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
};
