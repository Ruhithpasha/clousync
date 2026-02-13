const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const imageRoutes = require("./routes/imageRoutes");
const albumRoutes = require("./routes/albumRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();
const UPLOAD_DIR = path.join(__dirname, "../uploads");

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Routes
app.use("/", imageRoutes);
app.use("/", albumRoutes);
app.use("/", profileRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

module.exports = app;
