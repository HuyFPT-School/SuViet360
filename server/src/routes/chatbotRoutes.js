const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { askChatbot } = require("../controllers/chatbotController");

// All routes require authentication
router.use(protect);

router.post("/ask", askChatbot);

module.exports = router;
