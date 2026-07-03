const AppError = require("../utils/AppError");

/**
 * Middleware to check if user has the required subscription tier.
 * Usage: requireTier("Student Plus", "Student Pro")
 */
const requireTier = (...allowedTiers) => {
  return (req, res, next) => {
    const userTier = req.user?.subscriptionTier || "Free";

    if (!allowedTiers.includes(userTier)) {
      return next(
        new AppError(
          `Tính năng này yêu cầu gói ${allowedTiers.join(" hoặc ")}. Gói hiện tại của bạn: ${userTier}.`,
          403
        )
      );
    }

    // Check if subscription is expired
    if (userTier !== "Free" && req.user.subscriptionExpiry && req.user.subscriptionExpiry < new Date()) {
      return next(
        new AppError("Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục.", 403)
      );
    }

    next();
  };
};

module.exports = { requireTier };
