const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const subscriptionService = require("../services/subscriptionService");
const PodcastRequest = require("../models/PodcastRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const GiftCode = require("../models/GiftCode");
const Coupon = require("../models/Coupon");
const Transaction = require("../models/Transaction");
const env = require("../config/env");
const Subscription = require("../models/Subscription");
const SubscriptionTier = require("../models/SubscriptionTier");
const Podcast = require("../models/Podcast");

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

  const escapedIdentifier = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { name: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
    ],
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
    .populate("tierId")
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

  const cleanTitle = title.trim();
  const Podcast = require("../models/Podcast");
  const existingPodcast = await Podcast.findOne({
    status: "Published",
    isPrivate: { $ne: true },
    title: { $regex: new RegExp(cleanTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "i") }
  });

  if (existingPodcast) {
    throw new AppError(`Chủ đề "${cleanTitle}" đã có podcast trên hệ thống: "${existingPodcast.title}". Bạn có thể nghe ngay mà không cần gửi yêu cầu.`, 400);
  }

  const request = await PodcastRequest.create({
    requesterId: req.user._id,
    title: cleanTitle,
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
  const requests = await PodcastRequest.find({ requesterId: req.user._id })
    .populate("assignedTeacherId", "name avatar")
    .populate("resultPodcastId", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// GET /api/subscriptions/lesson-requests/teacher (for teachers)
const getTeacherLessonRequests = asyncHandler(async (req, res) => {
  const requests = await PodcastRequest.find({
    $or: [
      { status: "Pending" },
      { assignedTeacherId: req.user._id },
    ],
  })
    .populate("requesterId", "name avatar email")
    .populate("assignedTeacherId", "name avatar")
    .populate("resultPodcastId", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// PUT /api/subscriptions/lesson-requests/:id/accept
const acceptLessonRequest = asyncHandler(async (req, res) => {
  const { needsGameCreation, pedagogicalNotes, estimatedCompletionDate, resultPodcastId } = req.body;

  const request = await PodcastRequest.findById(req.params.id);
  if (!request) throw new AppError("Yêu cầu không tồn tại", 404);
  if (request.status !== "Pending") throw new AppError("Yêu cầu đã được xử lý", 400);

  request.status = "InProgress"; // Go directly to InProgress (Đang soạn)
  request.assignedTeacherId = req.user._id;

  if (resultPodcastId) {
    request.resultPodcastId = resultPodcastId;
  }

  if (needsGameCreation !== undefined) {
    request.needsGameCreation = !!needsGameCreation;
    if (needsGameCreation) {
      request.gameCreationStatus = "Requested";
    }
  }
  if (pedagogicalNotes !== undefined) {
    request.pedagogicalNotes = pedagogicalNotes;
  }
  if (estimatedCompletionDate) {
    request.estimatedCompletionDate = new Date(estimatedCompletionDate);
  }

  await request.save();

  // Notify requester
  await Notification.create({
    recipient: request.requesterId,
    type: "Lesson_Request_Accepted",
    title: "Yêu cầu bài học đang được soạn thảo!",
    message: `Giáo viên ${req.user.name} đã nhận yêu cầu bài học "${request.title}" của bạn và đang tiến hành soạn thảo.`,
    link: "/subscription?tab=requests",
  });

  await request.populate("resultPodcastId", "title");

  res.status(200).json({ success: true, data: request });
});

// PUT /api/subscriptions/lesson-requests/:id/reject
const rejectLessonRequest = asyncHandler(async (req, res) => {
  const request = await PodcastRequest.findById(req.params.id);
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

// PUT /api/subscriptions/lesson-requests/:id/in-progress
const startLessonRequest = asyncHandler(async (req, res) => {
  const request = await PodcastRequest.findById(req.params.id);
  if (!request) throw new AppError("Yêu cầu không tồn tại", 404);
  if (request.status !== "Accepted") throw new AppError("Chỉ có thể chuyển sang Đang tiến hành sau khi đã Chấp nhận", 400);
  if (request.assignedTeacherId.toString() !== req.user._id.toString()) {
    throw new AppError("Bạn không được phân công xử lý yêu cầu này", 403);
  }

  request.status = "InProgress";
  await request.save();

  await Notification.create({
    recipient: request.requesterId,
    type: "System",
    title: "Bài học đang được soạn thảo!",
    message: `Yêu cầu bài học "${request.title}" của bạn đang được soạn thảo bởi Giáo viên ${req.user.name}.`,
    link: "/subscription?tab=requests",
  });

  await request.populate("resultPodcastId", "title");

  res.status(200).json({ success: true, data: request });
});

// PUT /api/subscriptions/lesson-requests/:id/complete
const completeLessonRequest = asyncHandler(async (req, res) => {
  const request = await PodcastRequest.findById(req.params.id);
  if (!request) throw new AppError("Yêu cầu không tồn tại", 404);
  if (request.status !== "InProgress") throw new AppError("Chỉ có thể chuyển sang Hoàn thành khi đang ở trạng thái Đang tiến hành", 400);
  if (request.assignedTeacherId.toString() !== req.user._id.toString()) {
    throw new AppError("Bạn không được phân công xử lý yêu cầu này", 403);
  }

  const finalPodcastId = req.body.resultPodcastId || request.resultPodcastId;
  if (!finalPodcastId) throw new AppError("Mã podcast đã tạo là bắt buộc để hoàn thành", 400);

  request.status = "Completed";
  request.resultPodcastId = finalPodcastId;

  // Retrieve the linked podcast and make it private to this Student Pro (Issue #3 upgrade)
  const Podcast = require("../models/Podcast");
  const linkedPodcast = await Podcast.findById(finalPodcastId);
  if (linkedPodcast) {
    linkedPodcast.isPrivate = true;
    if (!linkedPodcast.allowedUsers.includes(request.requesterId)) {
      linkedPodcast.allowedUsers.push(request.requesterId);
    }
    await linkedPodcast.save();

    // If the podcast has a game (lessonId) linked, mark the request's gameCreationStatus as Completed
    if (linkedPodcast.lessonId) {
      request.gameCreationStatus = "Completed";
    }
  }

  await request.save();

  await Notification.create({
    recipient: request.requesterId,
    type: "System",
    title: "Yêu cầu bài học đã hoàn thành!",
    message: `Yêu cầu bài học (podcast) "${request.title}" của bạn đã hoàn thành. Hãy vào nghe ngay!`,
    link: `/podcasts/${finalPodcastId}`,
  });

  await request.populate("resultPodcastId", "title");

  res.status(200).json({ success: true, data: request });
});

// GET /api/subscriptions/admin/lesson-requests
const getAllLessonRequestsForAdmin = asyncHandler(async (req, res) => {
  const requests = await PodcastRequest.find()
    .populate("requesterId", "name email avatar")
    .populate("assignedTeacherId", "name email avatar")
    .populate("resultPodcastId", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// ─── Admin: Coupon Management ──────────────────────────────────────────

// POST /api/subscriptions/coupons (Admin only)
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, maxUses, minPurchaseAmount, applicableTiers, startDate, endDate, description } = req.body;
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
    startDate: startDate ? new Date(startDate) : undefined,
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

  let giftCodeObj = null;
  if (transaction.status === "Completed" && transaction.isGift) {
    const GiftCode = require("../models/GiftCode");
    giftCodeObj = await GiftCode.findOne({ transactionId: transaction._id });
  }

  res.status(200).json({
    success: true,
    data: {
      status: transaction.status,
      transactionId: transaction.transactionId,
      giftCode: giftCodeObj ? { code: giftCodeObj.code } : null,
    },
  });
});

// POST /api/subscriptions/sepay-webhook
const sepayWebhook = asyncHandler(async (req, res) => {
  const env = require("../config/env");

  // Validate webhook secret token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("Không có token xác thực webhook", 401);
  }
  
  const parts = authHeader.split(" ");
  const token = parts.length > 1 ? parts[1] : parts[0];
  
  if (token !== env.sepayWebhookToken) {
    throw new AppError("Token xác thực webhook không hợp lệ", 403);
  }

  const { content, transferAmount, code: gatewayRef } = req.body;
  if (!content || !transferAmount) {
    throw new AppError("Thiếu thông tin giao dịch từ webhook", 400);
  }

  // Find transaction code in the transfer description (supports both TXN-YYYYMMDD-RAND and stripped TXNYYYYMMDDRAND)
  const match = content.match(/TXN-?\d{8}-?[0-9A-Z]{8}/i);
  if (!match) {
    console.log(`[SepayWebhook] Ignored payment. Description "${content}" does not contain a valid transaction ID.`);
    return res.status(200).json({ success: true, message: "Transaction ID not found in description" });
  }

  let transactionId = match[0].toUpperCase();
  // Normalize to database standard (TXN-YYYYMMDD-RANDOM)
  const cleanId = transactionId.replace(/-/g, "");
  if (cleanId.length === 19) {
    transactionId = `TXN-${cleanId.slice(3, 11)}-${cleanId.slice(11)}`;
  }

  const checkTransaction = await Transaction.findOne({ transactionId });
  if (!checkTransaction) {
    console.log(`[SepayWebhook] Transaction ${transactionId} not found in database.`);
    return res.status(200).json({ success: true, message: "Transaction not found" });
  }

  if (checkTransaction.status === "Completed") {
    return res.status(200).json({ success: true, message: "Transaction already processed" });
  }

  if (transferAmount < checkTransaction.amount) {
    console.log(`[SepayWebhook] Amount mismatch for ${transactionId}. Expected: ${checkTransaction.amount}, Got: ${transferAmount}`);
    checkTransaction.status = "Failed";
    checkTransaction.metadata = { ...checkTransaction.metadata, sepayError: "Amount mismatch", sepayPayload: req.body };
    await checkTransaction.save();
    return res.status(200).json({ success: true, message: "Amount mismatch" });
  }

  // Atomically update transaction to Completed to act as a lock
  const transaction = await Transaction.findOneAndUpdate(
    { transactionId, status: "Pending" },
    {
      status: "Completed",
      paymentMethod: "sepay",
      paymentGatewayRef: gatewayRef || "",
      $set: { "metadata.sepayPayload": req.body }
    },
    { new: true }
  );

  if (!transaction) {
    return res.status(200).json({ success: true, message: "Transaction already processed or state modified" });
  }

  const subscriptionService = require("../services/subscriptionService");
  const SubscriptionTier = require("../models/SubscriptionTier");

  if (transaction.isGift) {
    const giftMode = transaction.metadata?.giftDeliveryMode || "code";

    if (giftMode === "instant") {
      // Activate immediately for recipient
      await subscriptionService.activateSubscription(
        transaction.recipientId,
        transaction.tierId,
        transaction.billingCycle,
        transaction.buyerId,
        transaction.giftMessage
      );

      // Notify recipient
      const buyer = await User.findById(transaction.buyerId);
      const tier = await SubscriptionTier.findById(transaction.tierId);
      await Notification.create({
        recipient: transaction.recipientId,
        type: "Gift_Received",
        title: "Bạn nhận được quà tặng!",
        message: `${buyer ? buyer.name : "Một người bạn"} đã tặng bạn gói ${tier ? tier.name : "VIP"}!${transaction.giftMessage ? " Lời nhắn: " + transaction.giftMessage : ""}`,
        link: "/subscription",
      });

      // Notify buyer
      await Notification.create({
        recipient: transaction.buyerId,
        type: "System",
        title: "Tặng quà thành công!",
        message: `Thanh toán thành công gói tặng. Gói VIP đã được kích hoạt trực tiếp cho người nhận.`,
        link: "/subscription",
      });
    } else {
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
        title: "Mã quà tặng đã sẵn sàng!",
        message: `Thanh toán thành công gói tặng. Mã quà tặng đã được tạo cho bạn gửi đi.`,
        link: "/subscription",
      });
    }
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
      title: "Nâng cấp tài khoản thành công!",
      message: `Tài khoản của bạn đã được nâng cấp lên gói ${tier ? tier.name : "VIP"}.`,
      link: "/subscription",
    });
  }

  // Increment coupon usage if used
  if (transaction.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: transaction.couponCode },
      { $inc: { usedCount: 1 } }
    );
  }

  console.log(`[SepayWebhook] Processed successfully for transaction ${transactionId}`);
  res.status(200).json({ success: true, message: "Processed successfully" });
});

// GET /api/subscriptions/admin/dashboard-stats
const getAdminDashboardStats = asyncHandler(async (req, res) => {
  // 1. Basic Stats
  const totalActiveSubscriptions = await Subscription.countDocuments({ status: "Active" });
  const totalUsers = await User.countDocuments({});

  const revenueResult = await Transaction.aggregate([
    { $match: { status: "Completed" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const totalTransactions = revenueResult[0]?.count || 0;

  // 2. Revenue by month for the last 6 months (including current month)
  const monthlyRevenue = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const matchResult = await Transaction.aggregate([
      {
        $match: {
          status: "Completed",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthLabel = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
    monthlyRevenue.push({
      month: monthLabel,
      revenue: matchResult[0]?.total || 0,
      transactions: matchResult[0]?.count || 0
    });
  }

  // 3. Recent Transactions
  const recentTransactions = await Transaction.find({ status: "Completed" })
    .populate("buyerId", "name email")
    .populate("recipientId", "name email")
    .populate("tierId", "name slug")
    .sort({ createdAt: -1 })
    .limit(20);

  // 4. All Subscriptions (Active & Expired)
  const subscriptions = await Subscription.find({})
    .populate("userId", "name email avatar")
    .populate("tierId", "name slug")
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalActiveSubscriptions,
        totalRevenue,
        totalTransactions,
        totalUsers
      },
      monthlyRevenue,
      recentTransactions,
      subscriptions
    }
  });
});

const getUserTransactionsForAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transactions = await Transaction.find({ buyerId: id })
    .populate("buyerId", "name email")
    .populate("recipientId", "name email")
    .populate("tierId", "name slug")
    .sort({ createdAt: -1 });

  const subscriptions = await Subscription.find({ userId: id })
    .populate("userId", "name email avatar")
    .populate("tierId", "name slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      transactions,
      subscriptions,
    }
  });
});

const updateTierPrice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { priceMonthly, priceYearly } = req.body;

  if (priceMonthly === undefined && priceYearly === undefined) {
    throw new AppError("Vui lòng cung cấp ít nhất một giá trị giá mới", 400);
  }

  const updateFields = {};
  if (priceMonthly !== undefined) {
    if (isNaN(Number(priceMonthly)) || Number(priceMonthly) < 0) {
      throw new AppError("Giá tháng không hợp lệ", 400);
    }
    updateFields.priceMonthly = Number(priceMonthly);
  }
  if (priceYearly !== undefined) {
    if (isNaN(Number(priceYearly)) || Number(priceYearly) < 0) {
      throw new AppError("Giá năm không hợp lệ", 400);
    }
    updateFields.priceYearly = Number(priceYearly);
  }

  const tier = await SubscriptionTier.findByIdAndUpdate(id, updateFields, { new: true });
  if (!tier) {
    throw new AppError("Không tìm thấy gói thành viên", 404);
  }

  res.status(200).json({
    success: true,
    message: "Cập nhật giá gói thành viên thành công",
    data: tier,
  });
});

// POST /api/subscriptions/admin/gift-codes/bulk (Admin only)
const generateBulkGiftCodes = asyncHandler(async (req, res) => {
  const { tierId, billingCycle, giftMessage, quantity, expiresInDays } = req.body;

  if (!tierId || !billingCycle || !quantity) {
    throw new AppError("Vui lòng cung cấp gói thành viên, chu kỳ và số lượng", 400);
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty < 1 || qty > 1000) {
    throw new AppError("Số lượng mã không hợp lệ (từ 1 đến 1000)", 400);
  }

  const tier = await SubscriptionTier.findById(tierId);
  if (!tier) throw new AppError("Gói subscription không tồn tại", 404);

  const days = Number(expiresInDays) || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const crypto = require("crypto");
  const generatedCodeStrings = new Set();

  // Try to generate unique codes
  let attempts = 0;
  const maxAttempts = qty * 5;

  while (generatedCodeStrings.size < qty && attempts < maxAttempts) {
    attempts++;
    const parts = [];
    for (let i = 0; i < 3; i++) {
      parts.push(crypto.randomBytes(2).toString("hex").toUpperCase());
    }
    const codeStr = `GIFT-${parts.join("-")}`;

    if (!generatedCodeStrings.has(codeStr)) {
      // Check if it already exists in DB
      const existing = await GiftCode.findOne({ code: codeStr });
      if (!existing) {
        generatedCodeStrings.add(codeStr);
      }
    }
  }

  if (generatedCodeStrings.size < qty) {
    throw new AppError("Không thể tạo đủ số lượng mã duy nhất. Vui lòng thử lại.", 500);
  }

  const bulkData = Array.from(generatedCodeStrings).map(code => ({
    code,
    tierId,
    billingCycle,
    senderId: req.user._id,
    recipientEmail: "",
    giftMessage: giftMessage || "Mã quà tặng do Admin tạo hàng loạt",
    status: "Pending",
    expiresAt,
  }));

  const createdCodes = await GiftCode.insertMany(bulkData);

  res.status(201).json({
    success: true,
    message: `Đã tạo thành công ${qty} mã quà tặng`,
    data: createdCodes,
  });
});

// GET /api/subscriptions/admin/gift-codes (Admin only)
const getGiftCodesForAdmin = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { code: searchRegex },
      { giftMessage: searchRegex },
    ];
  }

  const total = await GiftCode.countDocuments(filter);
  const giftCodes = await GiftCode.find(filter)
    .populate("tierId", "name slug")
    .populate("senderId", "name email")
    .populate("redeemedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: giftCodes,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// DELETE /api/subscriptions/admin/gift-codes/:id (Admin only)
const deleteGiftCodeForAdmin = asyncHandler(async (req, res) => {
  const giftCode = await GiftCode.findById(req.params.id);
  if (!giftCode) {
    throw new AppError("Mã quà tặng không tồn tại", 404);
  }

  if (giftCode.status === "Redeemed") {
    throw new AppError("Không thể xóa mã quà tặng đã được kích hoạt sử dụng", 400);
  }

  await GiftCode.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Đã xóa mã quà tặng thành công",
  });
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
  startLessonRequest,
  completeLessonRequest,
  getAllLessonRequestsForAdmin,
  createCoupon,
  getCoupons,
  deleteCoupon,
  getTransactionStatus,
  sepayWebhook,
  getAdminDashboardStats,
  getUserTransactionsForAdmin,
  updateTierPrice,
  generateBulkGiftCodes,
  getGiftCodesForAdmin,
  deleteGiftCodeForAdmin,
};
