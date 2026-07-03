const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const podcastRoutes = require("./routes/podcastRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const blogRoutes = require("./routes/blogRoutes");
const progressRoutes = require("./routes/progressRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const errorHandler = require("./middleware/errorHandler");
const { setCsrfToken, requireCsrfToken } = require("./middleware/csrf");

const app = express();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  env.clientUrl,
  "https://suviet.io.vn",
  "https://www.suviet.io.vn",
  "https://su-viet360.vercel.app",
  "http://localhost:3000",
  "http://localhost:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(setCsrfToken);
app.use(requireCsrfToken);

app.get("/api/csrf-token", (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      csrfToken: req.csrfToken,
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is healthy",
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/user/notifications", notificationRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api", podcastRoutes);

// Load subscription cron job
require("./jobs/subscriptionCron");

app.use(errorHandler);

module.exports = app;
