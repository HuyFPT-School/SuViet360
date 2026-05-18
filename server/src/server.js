const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const { connectRedis } = require("./config/redis");

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
