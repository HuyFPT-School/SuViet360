const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const { connectRedis } = require("./config/redis");

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

// For local development: start the REST API server
// Socket.IO is handled by the separate socket-server microservice
if (process.env.VERCEL !== "1") {
  const startServer = async () => {
    try {
      await ensureConnections();

      app.listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`REST API server running on port ${env.port}`);
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

