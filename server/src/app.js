const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const errorHandler = require("./middleware/errorHandler");
const { setCsrfToken, requireCsrfToken } = require("./middleware/csrf");

const app = express();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: env.clientUrl,
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
app.use(errorHandler);

module.exports = app;
