const Notification = require("../models/Notification");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// @desc    Follow a category
// @route   POST /api/user/notifications/follow
// @access  Private
const followCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;

  if (!category || !category.trim()) {
    throw new AppError("Category is required", 400);
  }

  const cleanCategory = category.trim();

  // Validate that the category actually exists in published podcasts or is default (Issue #6)
  const Podcast = require("../models/Podcast");
  const categoryExists = await Podcast.exists({ category: cleanCategory, status: "Published" });
  if (!categoryExists && cleanCategory !== "Chủ đề chung") {
    throw new AppError("Category does not exist", 400);
  }

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { followedCategories: cleanCategory },
  });

  res.status(200).json({
    success: true,
    message: `Followed category: ${cleanCategory}`,
    category: cleanCategory,
  });
});

// @desc    Unfollow a category
// @route   POST /api/user/notifications/unfollow
// @access  Private
const unfollowCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;

  if (!category || !category.trim()) {
    throw new AppError("Category is required", 400);
  }

  const cleanCategory = category.trim();

  await User.findByIdAndUpdate(req.user.id, {
    $pull: { followedCategories: cleanCategory },
  });

  res.status(200).json({
    success: true,
    message: `Unfollowed category: ${cleanCategory}`,
    category: cleanCategory,
  });
});

// @desc    Get user's followed categories
// @route   GET /api/user/notifications/followed
// @access  Private
const getFollowedCategories = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("followedCategories");

  res.status(200).json({
    success: true,
    data: user ? user.followedCategories : [],
  });
});

// @desc    Get user's notifications
// @route   GET /api/user/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unreadCount,
    data: notifications,
  });
});

// @desc    Mark a notification as read
// @route   PUT /api/user/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unreadCount,
    data: notification,
  });
});

// @desc    Mark all user's notifications as read
// @route   PUT /api/user/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
    unreadCount: 0,
  });
});

module.exports = {
  followCategory,
  unfollowCategory,
  getFollowedCategories,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
