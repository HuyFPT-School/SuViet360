const { createClient } = require("redis");
const env = require("./env");

let redisClient = null;

if (env.redisUrl) {
  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("[Redis] Client Error:", error.message);
  });

  redisClient.on("connect", () => {
    // eslint-disable-next-line no-console
    console.log("[Redis] Connected successfully");
  });
}

const connectRedis = async () => {
  if (!redisClient) {
    // eslint-disable-next-line no-console
    console.log("[Redis] Skipped – no REDIS_URL configured");
    return;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

/** Tiện ích kiểm tra nhanh Redis đã sẵn sàng chưa */
const isRedisReady = () => redisClient && redisClient.isOpen;

module.exports = {
  redisClient,
  connectRedis,
  isRedisReady,
};
