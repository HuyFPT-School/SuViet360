const dotenv = require("dotenv");
const path = require("path");

// Load .env from socket-server directory
dotenv.config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const { createServer } = require("http");
const { Server } = require("socket.io");

// Import socket handler and models from the main server package
// This avoids duplicating model/handler code
const { setupSocketHandlers } = require("../server/src/socket");

// Ensure models are registered by requiring them
require("../server/src/models/User");
require("../server/src/models/Conversation");
require("../server/src/models/Message");

const PORT = Number(process.env.PORT || 5002);
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/suviet360";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const startServer = async () => {
  try {
    // Connect to the same MongoDB as the REST API
    await mongoose.connect(MONGO_URI);
    // eslint-disable-next-line no-console
    console.log("[Socket Server] Connected to MongoDB");

    // Create a bare HTTP server (no Express needed for socket-only)
    const httpServer = createServer((req, res) => {
      // Health check endpoint for Render/Railway
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "socket-server" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    // Attach Socket.IO with CORS for the client
    const io = new Server(httpServer, {
      cors: {
        origin: CLIENT_URL,
        credentials: true,
      },
    });

    // Reuse the exact same socket handler from the main server
    setupSocketHandlers(io);

    // ─── Redis Pub/Sub Subscriber for real-time notifications ───
    if (process.env.REDIS_URL) {
      const { createClient } = require("redis");
      const redisSubscriber = createClient({ url: process.env.REDIS_URL });

      redisSubscriber.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("[Socket Server] Redis Subscriber Error:", err.message);
      });

      (async () => {
        try {
          await redisSubscriber.connect();
          // eslint-disable-next-line no-console
          console.log("[Socket Server] Redis Subscriber Connected");

          await redisSubscriber.subscribe("notification:new_podcast", async (messageStr) => {
            try {
              const { category, title, message, link } = JSON.parse(messageStr);
              
              // 1. Lấy danh sách những người đang follow category này
              const User = require("../server/src/models/User");
              const followers = await User.find({ followedCategories: category }).select("_id");
              
              if (followers.length > 0) {
                // 2. Phát sóng real-time thông báo qua Socket.IO tới các user đang online
                followers.forEach((follower) => {
                  const userId = follower._id.toString();
                  io.to(`user:${userId}`).emit("new_notification", {
                    title,
                    message,
                    link,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                  });
                });
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error("[Socket Server] Pub/Sub message processing error:", err.message);
            }
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Socket Server] Redis Subscriber connection failed:", err.message);
        }
      })();
    }

    httpServer.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[Socket Server] Running on port ${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`[Socket Server] CORS origin: ${CLIENT_URL}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Socket Server] Failed to start:", error);
    process.exit(1);
  }
};

startServer();
