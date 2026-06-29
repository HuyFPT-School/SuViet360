const { createServer } = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const { connectRedis, redisClient, isRedisReady } = require("./config/redis");
const { setupSocketHandlers } = require("./socket");

// Cache the connection promise to reuse across serverless invocations
let connectionPromise = null;

const ensureConnections = async () => {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await connectDB();
      await connectRedis();
    })();
  }
  return connectionPromise;
};

// For Vercel serverless: wrap app in a handler that connects DB first
const handler = async (req, res) => {
  await ensureConnections();
  return app(req, res);
};

// ─── Allowed CORS origins (shared with Express in app.js) ───
const allowedOrigins = [
  env.clientUrl,
  "https://suviet.io.vn",
  "https://www.suviet.io.vn",
  "https://su-viet360.vercel.app",
  "http://localhost:3000",
];

// For local / self-hosted: start the combined REST + Socket.IO server
if (process.env.VERCEL !== "1") {
  const startServer = async () => {
    try {
      await ensureConnections();

      // Create HTTP server from Express app
      const httpServer = createServer(app);

      // Attach Socket.IO to the same HTTP server
      const io = new Server(httpServer, {
        cors: {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          },
          credentials: true,
        },
      });

      // Register all socket event handlers (chat, presence, etc.)
      setupSocketHandlers(io);
      // eslint-disable-next-line no-console
      console.log("[Socket] Handlers attached to main server");

      // ─── Redis Pub/Sub Subscriber for real-time notifications ───
      if (isRedisReady()) {
        const { createClient } = require("redis");
        const redisSubscriber = createClient({ url: env.redisUrl });

        redisSubscriber.on("error", (err) => {
          // eslint-disable-next-line no-console
          console.error("[Redis Subscriber] Error:", err.message);
        });

        try {
          await redisSubscriber.connect();
          // eslint-disable-next-line no-console
          console.log("[Redis Subscriber] Connected");

          await redisSubscriber.subscribe(
            "notification:new_podcast",
            async (messageStr) => {
              try {
                const { category, title, message, link } =
                  JSON.parse(messageStr);

                const User = require("./models/User");
                const followers = await User.find({
                  followedCategories: category,
                }).select("_id");

                if (followers.length > 0) {
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
                console.error(
                  "[Redis Subscriber] Message processing error:",
                  err.message
                );
              }
            }
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            "[Redis Subscriber] Connection failed:",
            err.message
          );
        }
      }

      httpServer.listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(
          `REST API + Socket.IO server running on port ${env.port}`
        );
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to start server", error);
      process.exit(1);
    }
  };

  startServer();
}

// Export the handler for Vercel serverless (wraps app with DB connection)
module.exports = handler;

