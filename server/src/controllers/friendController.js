const asyncHandler = require("../utils/asyncHandler");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const Notification = require("../models/Notification");

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
const sendFriendRequest = asyncHandler(async (req, res) => {
  const recipientId = req.params.userId;
  const requesterId = req.user.id;

  if (requesterId === recipientId) {
    return res.status(400).json({ success: false, message: "Không thể kết bạn với chính mình." });
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
  }

  if (recipient.role !== "student" || !recipient.isEmailVerified) {
    return res.status(400).json({ success: false, message: "Chỉ được kết bạn với tài khoản học sinh (student) đã xác thực email." });
  }

  // Check existing friendship in both directions
  const existing = await Friendship.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existing) {
    if (existing.status === "Accepted") {
      return res.status(400).json({ success: false, message: "Hai bạn đã là bạn bè." });
    }
    if (existing.status === "Pending") {
      return res.status(400).json({ success: false, message: "Đã có lời mời kết bạn đang chờ." });
    }
    if (existing.status === "Rejected") {
      // Allow re-request: update to Pending
      existing.requester = requesterId;
      existing.recipient = recipientId;
      existing.status = "Pending";
      await existing.save();

      // Send notification
      await Notification.create({
        recipient: recipientId,
        type: "Friend_Request",
        title: "Lời mời kết bạn mới",
        message: `${req.user.name} đã gửi lời mời kết bạn cho bạn.`,
        link: "/blog",
      });

      return res.status(200).json({ success: true, data: existing });
    }
  }

  const friendship = await Friendship.create({
    requester: requesterId,
    recipient: recipientId,
    status: "Pending",
  });

  // Send notification
  await Notification.create({
    recipient: recipientId,
    type: "Friend_Request",
    title: "Lời mời kết bạn mới",
    message: `${req.user.name} đã gửi lời mời kết bạn cho bạn.`,
    link: "/blog",
  });

  res.status(201).json({ success: true, data: friendship });
});

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:friendshipId
const acceptFriendRequest = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);
  if (!friendship) {
    return res.status(404).json({ success: false, message: "Lời mời không tồn tại." });
  }

  if (friendship.recipient.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác này." });
  }

  if (friendship.status !== "Pending") {
    return res.status(400).json({ success: false, message: "Lời mời đã được xử lý." });
  }

  friendship.status = "Accepted";
  await friendship.save();

  // Notify requester
  await Notification.create({
    recipient: friendship.requester,
    type: "Friend_Accepted",
    title: "Lời mời kết bạn được chấp nhận",
    message: `${req.user.name} đã chấp nhận lời mời kết bạn của bạn.`,
    link: "/blog",
  });

  res.status(200).json({ success: true, data: friendship });
});

// @desc    Reject friend request
// @route   PUT /api/friends/reject/:friendshipId
const rejectFriendRequest = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);
  if (!friendship) {
    return res.status(404).json({ success: false, message: "Lời mời không tồn tại." });
  }

  if (friendship.recipient.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác này." });
  }

  if (friendship.status !== "Pending") {
    return res.status(400).json({ success: false, message: "Lời mời đã được xử lý." });
  }

  friendship.status = "Rejected";
  await friendship.save();

  res.status(200).json({ success: true, message: "Đã từ chối lời mời kết bạn." });
});

// @desc    Remove friend or cancel request
// @route   DELETE /api/friends/:friendshipId
const removeFriend = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);
  if (!friendship) {
    return res.status(404).json({ success: false, message: "Không tìm thấy mối quan hệ bạn bè." });
  }

  const userId = req.user.id;
  if (
    friendship.requester.toString() !== userId &&
    friendship.recipient.toString() !== userId
  ) {
    return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác này." });
  }

  await Friendship.findByIdAndDelete(friendship._id);

  res.status(200).json({ success: true, message: "Đã hủy kết bạn." });
});

// @desc    Get friends list
// @route   GET /api/friends
const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "Accepted",
  })
    .populate("requester", "name email avatar role level xp")
    .populate("recipient", "name email avatar role level xp");

  const friends = friendships.map((f) => {
    const friend =
      f.requester._id.toString() === userId ? f.recipient : f.requester;
    return {
      friendshipId: f._id,
      user: friend,
    };
  });

  res.status(200).json({ success: true, data: friends });
});

// @desc    Get pending friend requests (received)
// @route   GET /api/friends/requests
const getFriendRequests = asyncHandler(async (req, res) => {
  const requests = await Friendship.find({
    recipient: req.user.id,
    status: "Pending",
  })
    .populate("requester", "name email avatar role level xp")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// @desc    Get friend suggestions (users not yet friends)
// @route   GET /api/friends/suggestions
const getFriendSuggestions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all friendship user IDs (accepted, pending, rejected)
  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
  });

  const excludeIds = new Set([userId]);
  friendships.forEach((f) => {
    excludeIds.add(f.requester.toString());
    excludeIds.add(f.recipient.toString());
  });

  const search = req.query.search;
  const query = {
    _id: { $nin: Array.from(excludeIds) },
    role: "student",
    isEmailVerified: true,
    isLocked: { $ne: true },
  };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const suggestions = await User.find(query)
    .select("name email avatar role level xp")
    .limit(10)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: suggestions });
});

// @desc    Get sent pending friend requests
// @route   GET /api/friends/sent-requests
const getSentFriendRequests = asyncHandler(async (req, res) => {
  const requests = await Friendship.find({
    requester: req.user.id,
    status: "Pending",
  })
    .populate("recipient", "name email avatar role level xp")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  getFriendSuggestions,
  getSentFriendRequests,
};
