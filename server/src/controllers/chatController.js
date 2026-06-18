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
  if (currentRole === "user" && participant.role !== "teacher") {
    throw new AppError("Users can only chat with teachers", 403);
  }
  if (currentRole === "teacher" && participant.role !== "user") {
    throw new AppError("Teachers can only chat with users", 403);
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

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  getTeachers,
  getChatUsers,
};
