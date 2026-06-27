const crypto = require("crypto");
const mongoose = require("mongoose");
const { createServer } = require("http");
const { Server } = require("socket.io");
const ioClient = require("socket.io-client");
const jwt = require("jsonwebtoken");

const env = require("../src/config/env");
const app = require("../src/app");
const connectDB = require("../src/config/db");
const { connectRedis } = require("../src/config/redis");
const { setupSocketHandlers } = require("../src/socket");
const User = require("../src/models/User");
const Conversation = require("../src/models/Conversation");
const Message = require("../src/models/Message");

const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper to generate a signed JWT token for a user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

const createCookieJar = () => {
  const jar = new Map();

  const setCookies = (setCookieHeaders = []) => {
    setCookieHeaders.forEach((cookieLine) => {
      const [pair] = cookieLine.split(";");
      const [name, value] = pair.split("=");
      if (name) {
        jar.set(name.trim(), (value || "").trim());
      }
    });
  };

  const header = () => {
    if (jar.size === 0) return "";
    return Array.from(jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  };

  return { setCookies, header, jar };
};

const getSetCookieHeaders = (headers) => {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  if (!raw) {
    return [];
  }

  return raw.split(/,(?=[^;]+=[^;]+)/);
};

const requestJson = async (url, options = {}, jar) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (jar) {
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (jar) {
    jar.setCookies(getSetCookieHeaders(response.headers));
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { raw: text };
  }

  return { response, json };
};

const test = async () => {
  console.log("=== CHAT REALTIME FLOW INTEGRATION TEST ===");
  
  // 1. Setup server and database connection
  await connectDB();
  await connectRedis();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  setupSocketHandlers(io);

  await new Promise((resolve) => {
    httpServer.listen(TEST_PORT, () => {
      console.log(`Test server running on ${BASE_URL}`);
      resolve();
    });
  });

  const results = [];
  const record = (name, ok, detail = "") => {
    results.push({ test: name, status: ok ? "PASS" : "FAIL", detail });
    console.log(`[${ok ? "PASS" : "FAIL"}] ${name} ${detail ? `- ${detail}` : ""}`);
  };

  // 2. Create test users
  const userEmail = `student-${crypto.randomBytes(4).toString("hex")}@example.com`;
  const teacherEmail = `teacher-${crypto.randomBytes(4).toString("hex")}@example.com`;
  const password = "Test@1234";

  let testUser, testTeacher;
  let conversationId;
  let userSocket, teacherSocket;

  try {
    // Save test users to DB
    testUser = await User.create({
      name: "Test Student",
      email: userEmail,
      password,
      role: "student",
      isEmailVerified: true,
    });

    testTeacher = await User.create({
      name: "Test Teacher",
      email: teacherEmail,
      password,
      role: "teacher",
      isEmailVerified: true,
    });

    record("Create test users in DB", true, `Student: ${userEmail}, Teacher: ${teacherEmail}`);

    // Generate JWT tokens
    const userToken = generateToken(testUser._id);
    const teacherToken = generateToken(testTeacher._id);

    // 3. Test REST API: CSRF + Create Conversation
    const studentJar = createCookieJar();
    // Pre-populate cookie jar with user token
    studentJar.jar.set("token", userToken);

    // Get CSRF token
    const csrfData = await requestJson(`${BASE_URL}/api/csrf-token`, {}, studentJar);
    const csrfToken = csrfData.json?.data?.csrfToken;
    console.log("[DEBUG] CSRF Token retrieved:", csrfToken);
    console.log("[DEBUG] Cookie Jar content:", studentJar.header());

    // Create Conversation between student and teacher (as student)
    const convData = await requestJson(
      `${BASE_URL}/api/chat/conversations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ participantId: testTeacher._id.toString() }),
      },
      studentJar
    );

    console.log("[DEBUG] Create Conversation Response Status:", convData.response.status);
    console.log("[DEBUG] Create Conversation Response Body:", JSON.stringify(convData.json));

    const isConvCreated = convData.response.status === 201 || convData.response.status === 200;
    record("Create Conversation via HTTP API", isConvCreated, convData.json?.message);

    if (!isConvCreated) {
      throw new Error(`Failed to create conversation via HTTP API: ${convData.json?.message || convData.response.status}`);
    }

    conversationId = convData.json.data.conversation._id;
    record("Verify conversation format", Array.isArray(convData.json.data.conversation.participants) && convData.json.data.conversation.participants.length === 2, `Conversation ID: ${conversationId}`);

    // 4. Test REST API: Get conversations (Student perspective)
    const getConvsData = await requestJson(
      `${BASE_URL}/api/chat/conversations`,
      {
        method: "GET",
      },
      studentJar
    );
    const containsConversations = getConvsData.response.status === 200 && Array.isArray(getConvsData.json.data?.conversations);
    record("Get Conversations via HTTP API", containsConversations, `Count: ${getConvsData.json.data?.conversations?.length}`);

    // 5. Establish Socket.IO connections
    userSocket = ioClient(BASE_URL, {
      extraHeaders: {
        Cookie: `token=${userToken}`,
      },
      transports: ["websocket"],
      forceNew: true,
      autoConnect: false,
    });

    teacherSocket = ioClient(BASE_URL, {
      extraHeaders: {
        Cookie: `token=${teacherToken}`,
      },
      transports: ["websocket"],
      forceNew: true,
      autoConnect: false,
    });

    // Setup listener for online_users before connecting
    let teacherOnlineUsersEventPromise = new Promise((resolve) => {
      teacherSocket.on("online_users", (data) => {
        resolve(data.userIds);
      });
    });

    // Setup listener for typing
    const typingPromise = new Promise((resolve) => {
      userSocket.on("user_typing", (data) => {
        resolve(data);
      });
    });

    // Setup listener for stop_typing
    const stopTypingPromise = new Promise((resolve) => {
      userSocket.on("user_stop_typing", (data) => {
        resolve(data);
      });
    });

    // Setup listener for message
    const messagePromise = new Promise((resolve) => {
      teacherSocket.on("new_message", (msg) => {
        resolve(msg);
      });
    });

    // Setup listener for read receipt
    const readPromise = new Promise((resolve) => {
      userSocket.on("messages_read", (data) => {
        resolve(data);
      });
    });

    // Wait for connect event
    const userConnectPromise = new Promise((resolve, reject) => {
      userSocket.on("connect", resolve);
      userSocket.on("connect_error", reject);
    });

    const teacherConnectPromise = new Promise((resolve, reject) => {
      teacherSocket.on("connect", resolve);
      teacherSocket.on("connect_error", reject);
    });

    // Trigger connect
    userSocket.connect();
    teacherSocket.connect();

    await Promise.all([userConnectPromise, teacherConnectPromise]);
    record("Establish Socket.IO connections (authenticated)", true);

    // 6. Test Socket Event: user_online / online_users
    const currentOnlineUsers = await teacherOnlineUsersEventPromise;
    record("Receive online_users event on connection", Array.isArray(currentOnlineUsers), `Online count: ${currentOnlineUsers.length}`);

    // 7. Test Socket Event: typing / user_typing
    // Teacher starts typing
    teacherSocket.emit("typing", { conversationId });
    const typingData = await typingPromise;
    record(
      "Receive typing indicator (user_typing)",
      typingData.conversationId === conversationId && typingData.userId === testTeacher._id.toString()
    );

    // 8. Test Socket Event: stop_typing / user_stop_typing
    teacherSocket.emit("stop_typing", { conversationId });
    const stopTypingData = await stopTypingPromise;
    record(
      "Receive stop typing indicator (user_stop_typing)",
      stopTypingData.conversationId === conversationId && stopTypingData.userId === testTeacher._id.toString()
    );

    // 9. Test Socket Event: send_message / new_message
    const messageContent = "Hello Teacher! This is a real-time integration test.";
    userSocket.emit("send_message", { conversationId, content: messageContent });

    const receivedMessage = await messagePromise;
    record(
      "Receive real-time message (new_message)",
      receivedMessage.content === messageContent &&
      receivedMessage.conversation === conversationId &&
      receivedMessage.sender._id === testUser._id.toString(),
      `Content: "${receivedMessage.content}"`
    );

    // Verify last message updated in DB
    const updatedConv = await Conversation.findById(conversationId);
    record(
      "Conversation lastMessage updated in DB",
      updatedConv.lastMessage.content === messageContent &&
      updatedConv.lastMessage.sender.toString() === testUser._id.toString()
    );

    // 10. Test Socket Event: mark_read / messages_read

    teacherSocket.emit("mark_read", { conversationId });
    const readReceipt = await readPromise;
    record(
      "Receive mark as read (messages_read)",
      readReceipt.conversationId === conversationId &&
      readReceipt.userId === testTeacher._id.toString()
    );

    // Verify message is marked read in DB
    const dbMessage = await Message.findOne({ conversation: conversationId });
    record(
      "Message readAt timestamp marked in DB",
      dbMessage && dbMessage.readAt !== null,
      `readAt: ${dbMessage?.readAt}`
    );

    // 11. Test REST API: get messages
    const getMsgsData = await requestJson(
      `${BASE_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        method: "GET",
      },
      studentJar
    );
    const containsMessages = getMsgsData.response.status === 200 && Array.isArray(getMsgsData.json.data?.messages);
    record(
      "Get Messages via HTTP API",
      containsMessages,
      `Count: ${getMsgsData.json.data?.messages?.length}, hasMore: ${getMsgsData.json.data?.hasMore}`
    );

  } catch (err) {
    record("Integration flow error", false, err.message);
  } finally {
    // 12. Cleanup
    console.log("Cleaning up test sockets and database records...");
    if (userSocket) userSocket.disconnect();
    if (teacherSocket) teacherSocket.disconnect();

    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    if (testTeacher) {
      await User.deleteOne({ _id: testTeacher._id });
    }
    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await Message.deleteMany({ conversation: conversationId });
    }

    // Stop server
    await new Promise((resolve) => {
      httpServer.close(() => {
        console.log("Test server stopped.");
        resolve();
      });
    });

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB.");
    }
  }

  // Final check
  const failed = results.filter((r) => r.status === "FAIL");
  console.log("\n=== TEST RESULTS SUMMARY ===");
  console.table(results);
  if (failed.length === 0) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exitCode = 0;
  } else {
    console.error(`❌ ${failed.length} TEST(S) FAILED.`);
    process.exitCode = 1;
  }
};

test();
