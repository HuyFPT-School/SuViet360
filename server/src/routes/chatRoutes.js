const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  getTeachers,
  getChatUsers,
} = require("../controllers/chatController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/chat/conversations - List user's conversations
router.get("/conversations", getConversations);

// POST /api/chat/conversations - Create or get existing conversation
router.post("/conversations", createConversation);

// GET /api/chat/conversations/:conversationId/messages - Get messages with pagination
router.get("/conversations/:conversationId/messages", getMessages);

// POST /api/chat/conversations/:conversationId/messages - Send a message
router.post("/conversations/:conversationId/messages", sendMessage);

// GET /api/chat/teachers - List all teachers (for users to start a chat)
router.get("/teachers", authorize("user"), getTeachers);

// GET /api/chat/users - List chat users (for teachers/admins)
router.get("/users", authorize("teacher", "admin"), getChatUsers);

module.exports = router;

