const SubscriptionTier = require("../models/SubscriptionTier");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const GiftCode = require("../models/GiftCode");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const { getPaymentAdapter } = require("./paymentService");

/**
 * Get all active subscription tiers, sorted by displayOrder.
 */
const getActiveTiers = async () => {
  return SubscriptionTier.find({ isActive: true }).sort({ displayOrder: 1 });
};

/**
 * Get a user's current active subscription.
 */
const getUserSubscription = async (userId) => {
  const sub = await Subscription.findOne({ userId, status: "Active" })
    .populate("tierId")
    .sort({ endDate: -1 });
  return sub;
};

/**
 * Validate and apply a coupon code.
 */
const validateCoupon = async (code, tierId, amount) => {
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  if (!coupon) throw new AppError("Mã giảm giá không hợp lệ hoặc đã hết hạn", 400);

  if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses) {
    throw new AppError("Mã giảm giá đã hết lượt sử dụng", 400);
  }

  if (coupon.applicableTiers.length > 0 && !coupon.applicableTiers.some(t => t.toString() === tierId.toString())) {
    throw new AppError("Mã giảm giá không áp dụng cho gói này", 400);
  }

  if (amount < coupon.minPurchaseAmount) {
    throw new AppError(`Đơn hàng tối thiểu ${coupon.minPurchaseAmount.toLocaleString()}đ để sử dụng mã này`, 400);
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = Math.floor(amount * coupon.discountValue / 100);
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, amount);

  return { coupon, discount };
};

/**
 * Activate a subscription for a user.
 */
const activateSubscription = async (userId, tierId, billingCycle, giftedBy = null, giftMessage = "") => {
  const mongoose = require("mongoose");
  const tier = mongoose.Types.ObjectId.isValid(tierId)
    ? await SubscriptionTier.findById(tierId)
    : await SubscriptionTier.findOne({ slug: tierId });
  if (!tier) throw new AppError("Gói subscription không tồn tại", 404);

  // Calculate end date
  const now = new Date();
  let baseDate = new Date();

  // Check if user already has an active subscription of the SAME tier to extend the period
  const userObj = await User.findById(userId);
  if (userObj && userObj.subscriptionTier === tier.name && userObj.subscriptionExpiry && userObj.subscriptionExpiry > now) {
    baseDate = new Date(userObj.subscriptionExpiry);
  }

  const endDate = new Date(baseDate);
  if (billingCycle === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // Expire any existing active subscription
  await Subscription.updateMany(
    { userId, status: "Active" },
    { status: "Expired" }
  );

  // Create new subscription
  const subscription = await Subscription.create({
    userId,
    tierId: tier._id,
    status: "Active",
    startDate: now,
    endDate,
    billingCycle,
    giftedBy,
    giftMessage,
  });

  // Update user tier
  await User.findByIdAndUpdate(userId, {
    subscriptionTier: tier.name,
    subscriptionExpiry: endDate,
  });

  return subscription;
};

/**
 * Purchase a subscription for self.
 */
const purchaseForSelf = async (userId, tierId, billingCycle, couponCode = "", paymentMethod = "sepay") => {
  const mongoose = require("mongoose");
  const tier = mongoose.Types.ObjectId.isValid(tierId)
    ? await SubscriptionTier.findById(tierId)
    : await SubscriptionTier.findOne({ slug: tierId });
  if (!tier) throw new AppError("Gói subscription không tồn tại", 404);
  if (tier.slug === "free") throw new AppError("Không thể mua gói Free", 400);

  const price = billingCycle === "monthly" ? tier.priceMonthly : tier.priceYearly;
  let discount = 0;
  let couponCodeUsed = "";

  if (couponCode) {
    const result = await validateCoupon(couponCode, tier._id, price);
    discount = result.discount;
    couponCodeUsed = couponCode.toUpperCase();
  }

  const finalAmount = price - discount;

  // Create transaction
  const transaction = await Transaction.create({
    buyerId: userId,
    recipientId: userId,
    tierId: tier._id,
    amount: finalAmount,
    originalAmount: price,
    billingCycle,
    isGift: false,
    couponCode: couponCodeUsed,
    discountAmount: discount,
    paymentMethod,
    status: (paymentMethod === "demo" || finalAmount === 0) ? "Completed" : "Pending",
  });

  let subscription = null;

  // If paymentMethod is demo or amount is 0, auto-complete
  if (paymentMethod === "demo" || finalAmount === 0) {
    const adapter = getPaymentAdapter();
    const paymentResult = await adapter.createPayment(finalAmount, `Mua gói ${tier.name}`, "");
    
    transaction.paymentGatewayRef = paymentResult.ref;
    transaction.paymentMethod = paymentResult.method;
    await transaction.save();

    // Increment coupon usage
    if (couponCodeUsed) {
      await Coupon.findOneAndUpdate(
        { code: couponCodeUsed },
        { $inc: { usedCount: 1 } }
      );
    }

    // Activate subscription
    subscription = await activateSubscription(userId, tierId, billingCycle);

    // Send notification
    await Notification.create({
      recipient: userId,
      type: "Subscription_Activated",
      title: "Nâng cấp tài khoản thành công!",
      message: `Bạn đã nâng cấp lên gói ${tier.name} (${billingCycle === "monthly" ? "hàng tháng" : "hàng năm"}).`,
      link: "/subscription",
    });
  }

  return { transaction, subscription };
};

/**
 * Purchase a gift subscription.
 * mode: "instant" (apply immediately) or "code" (generate redeem code)
 */
const purchaseGift = async (buyerId, recipientIdentifier, tierId, billingCycle, giftMessage = "", mode = "code", couponCode = "", paymentMethod = "sepay") => {
  const mongoose = require("mongoose");
  const tier = mongoose.Types.ObjectId.isValid(tierId)
    ? await SubscriptionTier.findById(tierId)
    : await SubscriptionTier.findOne({ slug: tierId });
  if (!tier) throw new AppError("Gói subscription không tồn tại", 404);
  if (tier.slug === "free") throw new AppError("Không thể tặng gói Free", 400);

  let recipient;
  if (mode === "code" && recipientIdentifier === "gift_code_generation") {
    // For redeem code generation, the buyer is the initial recipient of the transaction
    recipient = await User.findById(buyerId);
  } else {
    // Find recipient by email or name
    recipient = await User.findOne({
      $or: [
        { email: recipientIdentifier.toLowerCase() },
        { name: { $regex: new RegExp(`^${recipientIdentifier}$`, "i") } },
      ],
    });

    if (!recipient) throw new AppError("Không tìm thấy người nhận. Vui lòng kiểm tra email hoặc tên.", 404);
    if (recipient._id.toString() === buyerId.toString()) throw new AppError("Bạn không thể tặng quà cho chính mình", 400);
  }

  const price = billingCycle === "monthly" ? tier.priceMonthly : tier.priceYearly;
  let discount = 0;
  let couponCodeUsed = "";

  if (couponCode) {
    const result = await validateCoupon(couponCode, tier._id, price);
    discount = result.discount;
    couponCodeUsed = couponCode.toUpperCase();
  }

  const finalAmount = price - discount;

  // Create transaction
  const transaction = await Transaction.create({
    buyerId,
    recipientId: recipient._id,
    tierId: tier._id,
    amount: finalAmount,
    originalAmount: price,
    billingCycle,
    isGift: true,
    giftMessage,
    couponCode: couponCodeUsed,
    discountAmount: discount,
    paymentMethod,
    status: (paymentMethod === "demo" || finalAmount === 0) ? "Completed" : "Pending",
    metadata: { giftDeliveryMode: mode },
  });

  let giftCode = null;

  // If paymentMethod is demo or amount is 0, auto-complete
  if (paymentMethod === "demo" || finalAmount === 0) {
    const adapter = getPaymentAdapter();
    const paymentResult = await adapter.createPayment(finalAmount, `Tặng gói ${tier.name}`, "");

    transaction.paymentGatewayRef = paymentResult.ref;
    transaction.paymentMethod = paymentResult.method;
    await transaction.save();

    // Increment coupon usage
    if (couponCodeUsed) {
      await Coupon.findOneAndUpdate(
        { code: couponCodeUsed },
        { $inc: { usedCount: 1 } }
      );
    }

    if (mode === "instant") {
      // Apply subscription immediately
      await activateSubscription(recipient._id, tierId, billingCycle, buyerId, giftMessage);

      // Notify recipient
      const buyer = await User.findById(buyerId);
      await Notification.create({
        recipient: recipient._id,
        type: "Gift_Received",
        title: "Bạn nhận được quà tặng!",
        message: `${buyer.name} đã tặng bạn gói ${tier.name}!${giftMessage ? " Lời nhắn: " + giftMessage : ""}`,
        link: "/subscription",
      });
    } else {
      // Generate redeem code
      giftCode = await GiftCode.create({
        transactionId: transaction._id,
        tierId,
        billingCycle,
        senderId: buyerId,
        recipientEmail: recipient.email,
        giftMessage,
      });
    }
  }

  return { transaction, giftCode, recipient: { _id: recipient._id, name: recipient.name, email: recipient.email } };
};

/**
 * Redeem a gift code.
 */
const redeemGiftCode = async (userId, code) => {
  const giftCode = await GiftCode.findOne({ code: code.toUpperCase() })
    .populate("tierId")
    .populate("senderId", "name email");

  if (!giftCode) throw new AppError("Mã quà tặng không hợp lệ", 404);
  if (giftCode.status === "Redeemed") throw new AppError("Mã quà tặng đã được sử dụng", 400);
  if (giftCode.status === "Expired" || giftCode.expiresAt < new Date()) {
    if (giftCode.status !== "Expired") {
      giftCode.status = "Expired";
      await giftCode.save();
    }
    throw new AppError("Mã quà tặng đã hết hạn", 400);
  }

  // Activate subscription
  await activateSubscription(
    userId,
    giftCode.tierId._id,
    giftCode.billingCycle,
    giftCode.senderId._id,
    giftCode.giftMessage
  );

  // Mark code as redeemed
  giftCode.status = "Redeemed";
  giftCode.redeemedBy = userId;
  giftCode.redeemedAt = new Date();
  await giftCode.save();

  // Notify user
  await Notification.create({
    recipient: userId,
    type: "Gift_Received",
    title: "Quà tặng đã được kích hoạt!",
    message: `${giftCode.senderId.name} đã tặng bạn gói ${giftCode.tierId.name}!${giftCode.giftMessage ? " Lời nhắn: " + giftCode.giftMessage : ""}`,
    link: "/subscription",
  });

  return { tier: giftCode.tierId, sender: giftCode.senderId, giftMessage: giftCode.giftMessage };
};

/**
 * Get user's transaction history.
 */
const getTransactionHistory = async (userId) => {
  return Transaction.find({
    $or: [{ buyerId: userId }, { recipientId: userId }],
  })
    .populate("tierId", "name slug")
    .populate("buyerId", "name email")
    .populate("recipientId", "name email")
    .sort({ createdAt: -1 });
};

/**
 * Expire subscriptions that have passed their end date. (Cron job)
 */
const expireSubscriptions = async () => {
  const now = new Date();

  const expiredSubs = await Subscription.find({
    status: "Active",
    endDate: { $lte: now },
  }).populate("tierId");

  for (const sub of expiredSubs) {
    sub.status = "Expired";
    await sub.save();

    // Downgrade user to Free
    await User.findByIdAndUpdate(sub.userId, {
      subscriptionTier: "Free",
      subscriptionExpiry: null,
    });

    // Notify
    await Notification.create({
      recipient: sub.userId,
      type: "Subscription_Expired",
      title: "Gói đăng ký đã hết hạn",
      message: `Gói ${sub.tierId.name} của bạn đã hết hạn. Nâng cấp lại để tiếp tục sử dụng các tính năng premium!`,
      link: "/subscription",
    });
  }

  return expiredSubs.length;
};

/**
 * Send reminder notifications for subscriptions expiring soon. (Cron job)
 */
const sendExpirationReminders = async () => {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  // 3-day reminder
  const subs3Day = await Subscription.find({
    status: "Active",
    endDate: { $gte: now, $lte: threeDaysLater },
  }).populate("tierId");

  for (const sub of subs3Day) {
    const daysLeft = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24));
    // Only send if exactly 3 or 1 days left (avoid spamming)
    if (daysLeft === 3 || daysLeft === 1) {
      const existing = await Notification.findOne({
        recipient: sub.userId,
        type: "Subscription_Expiring",
        createdAt: { $gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      });
      if (!existing) {
        await Notification.create({
          recipient: sub.userId,
          type: "Subscription_Expiring",
          title: `Gói ${sub.tierId.name} sắp hết hạn!`,
          message: `Gói ${sub.tierId.name} của bạn sẽ hết hạn sau ${daysLeft} ngày. Gia hạn ngay để không bị gián đoạn!`,
          link: "/subscription",
        });
      }
    }
  }
};

module.exports = {
  getActiveTiers,
  getUserSubscription,
  validateCoupon,
  activateSubscription,
  purchaseForSelf,
  purchaseGift,
  redeemGiftCode,
  getTransactionHistory,
  expireSubscriptions,
  sendExpirationReminders,
};
