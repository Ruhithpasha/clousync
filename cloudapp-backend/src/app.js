const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const imageRoutes = require("./routes/imageRoutes");
const albumRoutes = require("./routes/albumRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const UPLOAD_DIR = path.join(__dirname, "../uploads");

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://cloudsync.publicvm.com",
      "http://localhost",
      "capacitor://localhost",
    ],
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
app.use("/api", imageRoutes);
app.use("/api", albumRoutes);
app.use("/api", profileRoutes);
app.use("/api", adminRoutes);
app.use("/", imageRoutes); // Keep original routes for backward compatibility
app.use("/", albumRoutes);
app.use("/", profileRoutes);
app.use("/", adminRoutes);

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
