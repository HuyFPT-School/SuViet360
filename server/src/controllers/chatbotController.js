const asyncHandler = require("../utils/asyncHandler");

// @desc    Ask RAG AI history chatbot
// @route   POST /api/chatbot/ask
const askChatbot = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: "Câu hỏi không được để trống." });
  }

  const chatbotUrl = (process.env.CHATBOT_API_URL || process.env.RUNPOD_API_URL || "").trim();
  const chatbotKey = (process.env.CHATBOT_API_KEY || process.env.RUNPOD_API_KEY || "").trim();

  if (!chatbotUrl) {
    // Return a helpful mock response in development mode when keys are missing
    return res.status(200).json({
      success: true,
      answer: "Chào bạn! Hệ thống AI Chatbot đang ở chế độ chạy thử nghiệm (chưa cấu hình API URL). Khi được liên kết với mô hình AI Sử Việt, tôi sẽ giải đáp tất cả câu hỏi lịch sử của bạn!",
      has_context: false,
      sources: []
    });
  }

  try {
    const isRunPod = chatbotUrl.includes("runpod.ai");
    const headers = {
      "Content-Type": "application/json"
    };
    if (chatbotKey) {
      headers["Authorization"] = `Bearer ${chatbotKey}`;
    }

    const requestBody = isRunPod 
      ? { input: { question: question.trim() } }
      : { question: question.trim() };

    const response = await fetch(chatbotUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`AI API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // If RunPod, extract data.output. Otherwise, return data directly
    const result = isRunPod ? data.output : data;

    if (result) {
      return res.status(200).json({
        success: result.success !== undefined ? result.success : true,
        answer: result.answer || "Không nhận được câu trả lời từ mô hình.",
        has_context: result.has_context || false,
        sources: result.sources || []
      });
    } else {
      return res.status(200).json({
        success: true,
        answer: data.answer || "Không nhận được phản hồi hợp lệ từ mô hình.",
        has_context: false,
        sources: []
      });
    }
  } catch (error) {
    console.error("AI Chatbot Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi kết nối với máy chủ AI: " + error.message
    });
  }
});

module.exports = {
  askChatbot
};
