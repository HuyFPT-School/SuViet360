const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// --- RunPod Polling Helpers ---

/**
 * Gọi RunPod /run endpoint để gửi job bất đồng bộ.
 * Trả về { id, status } nếu thành công.
 */
async function runPodSubmitJob(baseUrl, apiKey, question) {
  // Chuyển từ /runsync sang /run
  const runUrl = baseUrl.replace(/\/runsync\/?$/, "/run");

  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(runUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ input: { question } }),
    signal: AbortSignal.timeout(30000), // 30s timeout cho việc submit
  });

  if (!response.ok) {
    throw new Error(`RunPod submit failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Poll RunPod /status/{id} cho đến khi job hoàn thành hoặc timeout.
 * @param {string} baseUrl - RunPod endpoint URL gốc
 * @param {string} apiKey - RunPod API key
 * @param {string} jobId - Job ID từ /run
 * @param {number} maxWaitMs - Thời gian chờ tối đa (ms)
 * @param {number} intervalMs - Khoảng cách giữa các lần poll (ms)
 */
async function runPodPollStatus(baseUrl, apiKey, jobId, maxWaitMs = 120000, intervalMs = 2000) {
  // Tạo URL status: lấy base API URL (trước /runsync hoặc /run)
  const statusUrl = baseUrl.replace(/\/(runsync|run)\/?$/, `/status/${jobId}`);

  const headers = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const startTime = Date.now();
  let lastStatus = "";

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(statusUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000), // 15s timeout per poll request
    });

    if (!res.ok) {
      throw new Error(`RunPod status check failed with status ${res.status}`);
    }

    const data = await res.json();
    lastStatus = data.status;

    // Job hoàn thành
    if (data.status === "COMPLETED") {
      return data.output;
    }

    // Job thất bại
    if (data.status === "FAILED") {
      const errorMsg = data.error || "Unknown error";
      throw new Error(`RunPod job failed: ${errorMsg}`);
    }

    // Job bị hủy
    if (data.status === "CANCELLED") {
      throw new Error("RunPod job was cancelled");
    }

    // Các status khác (IN_QUEUE, IN_PROGRESS) → tiếp tục poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Hết thời gian chờ
  throw new Error(
    `RunPod job timed out after ${maxWaitMs / 1000}s (last status: ${lastStatus}). ` +
    `Worker có thể đang cold start. Vui lòng thử lại.`
  );
}

// --- Controller ---

// @desc    Ask RAG AI history chatbot
// @route   POST /api/chatbot/ask
const askChatbot = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: "Câu hỏi không được để trống." });
  }

  // --- Enforce Daily AI Query Limits based on Subscription Tier ---
  let userToUpdate = null;
  if (req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (user.lastAIQueryDate !== todayStr) {
        user.lastAIQueryDate = todayStr;
        user.dailyAIQueriesCount = 0;
      }

      const isSubActive =
        user.subscriptionTier &&
        user.subscriptionTier !== "Free" &&
        user.subscriptionExpiry &&
        new Date(user.subscriptionExpiry) > new Date();

      const effectiveTier = isSubActive ? user.subscriptionTier : "Free";

      let dailyLimit = 3;
      if (effectiveTier === "Student Pro") {
        dailyLimit = 999999;
      } else if (effectiveTier === "Student Plus") {
        dailyLimit = 20;
      }

      if (user.dailyAIQueriesCount >= dailyLimit) {
        return res.status(403).json({
          success: false,
          answer: `Bạn đã sử dụng hết ${dailyLimit}/${dailyLimit} lượt hỏi AI hôm nay của gói ${effectiveTier}. Vui lòng nâng cấp lên gói Student Plus (20 lượt/ngày) hoặc Student Pro (Không giới hạn) để tiếp tục trò chuyện cùng AI Sử Việt!`,
          message: `Đã đạt giới hạn truy vấn AI trong ngày (${dailyLimit}/${dailyLimit}).`,
          tierLimitReached: true,
        });
      }

      userToUpdate = user;
    }
  }

  const recordSuccessfulQuery = async () => {
    if (userToUpdate) {
      userToUpdate.dailyAIQueriesCount += 1;
      await userToUpdate.save();
    }
  };

  const chatbotUrl = (process.env.CHATBOT_API_URL || process.env.RUNPOD_API_URL || "").trim();
  const chatbotKey = (process.env.CHATBOT_API_KEY || process.env.RUNPOD_API_KEY || "").trim();

  if (!chatbotUrl) {
    await recordSuccessfulQuery();
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
    let result;

    if (isRunPod) {
      // === RunPod: Gửi duy nhất 1 job qua /run và poll kết quả qua /status/{id} ===
      const submitResult = await runPodSubmitJob(chatbotUrl, chatbotKey, question.trim());
      
      if (!submitResult.id) {
        throw new Error("RunPod không trả về Job ID.");
      }

      console.log(`RunPod job submitted: ${submitResult.id} (status: ${submitResult.status})`);

      // Nếu job đã hoàn thành ngay (worker đã warm)
      if (submitResult.status === "COMPLETED" && submitResult.output) {
        result = submitResult.output;
      } else {
        // Poll cho đến khi hoàn thành (max 6 phút để cover cold start 3-5 phút, poll mỗi 3s)
        result = await runPodPollStatus(chatbotUrl, chatbotKey, submitResult.id, 360000, 3000);
      }
    } else {
      // === Non-RunPod API: gọi trực tiếp ===
      const headers = { "Content-Type": "application/json" };
      if (chatbotKey) {
        headers["Authorization"] = `Bearer ${chatbotKey}`;
      }

      const response = await fetch(chatbotUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: question.trim() }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        throw new Error(`AI API returned status ${response.status}`);
      }

      result = await response.json();
    }

    if (result) {
      await recordSuccessfulQuery();
      return res.status(200).json({
        success: result.success !== undefined ? result.success : true,
        answer: result.answer || "Không nhận được câu trả lời từ mô hình.",
        has_context: result.has_context || false,
        sources: result.sources || []
      });
    } else {
      return res.status(200).json({
        success: false,
        answer: "Mô hình AI đang khởi động, vui lòng thử lại sau vài giây.",
        has_context: false,
        sources: []
      });
    }
  } catch (error) {
    console.error("AI Chatbot Error:", error);
    
    // Phân loại lỗi để trả thông báo phù hợp
    const isTimeout = error.message.includes("timed out") || error.name === "TimeoutError";
    const isColdStart = error.message.includes("cold start") || error.message.includes("IN_QUEUE");
    
    let userMessage;
    if (isTimeout || isColdStart) {
      userMessage = "Mô hình AI đang trong quá trình khởi động (cold start). Vui lòng thử lại sau 30-60 giây.";
    } else {
      userMessage = "Lỗi kết nối với máy chủ AI. Vui lòng thử lại sau.";
    }

    return res.status(200).json({
      success: false,
      answer: userMessage,
      message: userMessage
    });
  }
});

/**
 * Thử gọi /runsync (đồng bộ) trước.
 * Nếu worker đã warm thì sẽ trả về nhanh (<30s).
 * Nếu cold start, sẽ throw error để fallback sang async.
 */
async function runPodRunSync(chatbotUrl, apiKey, question) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(chatbotUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ input: { question } }),
    signal: AbortSignal.timeout(35000), // 35s timeout cho runsync
  });

  if (!response.ok) {
    throw new Error(`RunPod /runsync returned status ${response.status}`);
  }

  const data = await response.json();

  // Nếu runsync trả về status khác COMPLETED → cold start đang xảy ra
  if (data.status && data.status !== "COMPLETED") {
    throw new Error(`RunPod /runsync returned non-completed status: ${data.status}`);
  }

  // Trả về output
  if (data.output) {
    return data.output;
  }

  // Nếu không có output field → dữ liệu trực tiếp
  if (data.answer) {
    return data;
  }

  throw new Error("RunPod /runsync returned no output");
}

module.exports = {
  askChatbot
};
