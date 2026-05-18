const { createClient } = require("redis");
const env = require("./env");

let redisClient = null;

if (env.redisUrl) {
  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Redis Client Error", error);
  });
}

const connectRedis = async () => {
  if (!redisClient) {
    return;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = {
  redisClient,
  connectRedis,
};
