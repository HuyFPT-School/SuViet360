const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/suviet360",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-in-production",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  mailerUser: process.env.MAILER_USER || "",
  mailerPassword: process.env.MAILER_PASSWORD || "",
  mailerHost: process.env.MAILER_HOST || "",
  mailerPort: Number(process.env.MAILER_PORT || 0),
  mailerFrom: process.env.MAILER_FROM || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  redisUrl: process.env.REDIS_URL || "",
  redisRefreshTtlMinutes: Number(
    process.env.REDIS_REFRESH_TTL_MINUTES || 10080
  ),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
};
