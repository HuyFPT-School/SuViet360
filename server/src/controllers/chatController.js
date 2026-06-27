const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

/* ─── GET /api/chat/conversations ─── */
const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "name avatar role")
    .sort({ "lastMessage.createdAt": -1, createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { conversations },
  });
});

/* ─── GET /api/chat/conversations/:conversationId/messages ─── */
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify conversation exists and user is a participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) {
    throw new AppError("You are not a participant of this conversation", 403);
  }

  // Cursor-based pagination
  const { before } = req.query;
  let limit = parseInt(req.query.limit, 10) || 30;
  if (limit > 50) limit = 50;
  if (limit < 1) limit = 1;

  const query = { conversation: conversationId };

  if (before) {
    if (!mongoose.Types.ObjectId.isValid(before)) {
      throw new AppError("Invalid cursor", 400);
    }
    query._id = { $lt: before };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("sender", "name avatar");

  const hasMore = messages.length > limit;
  if (hasMore) {
    messages.pop();
  }

  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

  res.status(200).json({
    status: "success",
    data: {
      messages,
      hasMore,
      nextCursor,
    },
  });
});

/* ─── POST /api/chat/conversations ─── */
const createConversation = asyncHandler(async (req, res) => {
  const { participantId } = req.body;

  if (!participantId) {
    throw new AppError("participantId is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(participantId)) {
    throw new AppError("Invalid participantId", 400);
  }

  if (participantId === req.user._id.toString()) {
    throw new AppError("Cannot create a conversation with yourself", 400);
  }

  // Check participant exists
  const participant = await User.findById(participantId);
  if (!participant) {
    throw new AppError("User not found", 404);
  }

  // Enforce role rules
  const currentRole = req.user.role;
  if (currentRole === "student" && participant.role !== "teacher") {
    throw new AppError("Students can only chat with teachers", 403);
  }
  if (currentRole === "teacher" && participant.role !== "student") {
    throw new AppError("Teachers can only chat with students", 403);
  }
  // admin can chat with anyone — no restriction

  // Check if conversation already exists
  const existing = await Conversation.findOne({
    participants: { $all: [req.user._id, participantId] },
  }).populate("participants", "name avatar role");

  if (existing) {
    return res.status(200).json({
      status: "success",
      data: { conversation: existing },
    });
  }

  // Create new conversation
  const conversation = await Conversation.create({
    participants: [req.user._id, participantId],
  });

  const populated = await Conversation.findById(conversation._id).populate(
    "participants",
    "name avatar role"
  );

  res.status(201).json({
    status: "success",
    data: { conversation: populated },
  });
});

/* ─── GET /api/chat/teachers ─── */
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "teacher" }).select(
    "name avatar email"
  );

  res.status(200).json({
    status: "success",
    data: { teachers },
  });
});

/* ─── GET /api/chat/users ─── */
const getChatUsers = asyncHandler(async (req, res) => {
  // Find all conversations where the current user is a participant
  const conversations = await Conversation.find({
    participants: req.user._id,
  }).select("participants");

  // Extract unique other participant IDs
  const otherUserIds = new Set();
  for (const conv of conversations) {
    for (const p of conv.participants) {
      const pId = p.toString();
      if (pId !== req.user._id.toString()) {
        otherUserIds.add(pId);
      }
    }
  }

  const users = await User.find({
    _id: { $in: Array.from(otherUserIds) },
  }).select("name avatar email role");

  res.status(200).json({
    status: "success",
    data: { users },
  });
});

/* ─── POST /api/chat/conversations/:conversationId/messages ─── */
const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const userId = req.user._id.toString();

  if (!content || typeof content !== "string" || !content.trim()) {
    throw new AppError("Message content is required", 400);
  }
  if (content.length > 2000) {
    throw new AppError("Message cannot exceed 2000 characters", 400);
  }

  // Verify conversation exists and user is a participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new AppError("Not a participant of this conversation", 403);
  }

  // Create message
  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    content: content.trim(),
  });

  // Update conversation lastMessage and unreadCount
  const otherUserId = conversation.participants
    .find((p) => p.toString() !== userId)
    ?.toString();

  conversation.lastMessage = {
    content: message.content,
    sender: message.sender,
    createdAt: message.createdAt,
  };

  if (otherUserId) {
    const currentUnread = conversation.unreadCount.get(otherUserId) || 0;
    conversation.unreadCount.set(otherUserId, currentUnread + 1);
  }

  await conversation.save();

  // Populate sender info for the response
  const populated = await Message.findById(message._id).populate(
    "sender",
    "name avatar"
  );

  res.status(201).json({
    status: "success",
    data: { message: populated },
  });
});

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  getTeachers,
  getChatUsers,
};
