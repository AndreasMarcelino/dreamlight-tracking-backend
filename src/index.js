require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Import database connection
const db = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const projectRoutes = require("./routes/project.routes");
const episodeRoutes = require("./routes/episode.routes");
const milestoneRoutes = require("./routes/milestone.routes");
const financeRoutes = require("./routes/finance.routes");
const assetRoutes = require("./routes/asset.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const { handleMulterError } = require("./middleware/upload.middleware");

// Trust proxy - required for rate limiting behind reverse proxy (Vercel, AWS Lambda, etc.)
app.set("trust proxy", 1);

// Middleware
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman, curl, server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❗ JANGAN throw error
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 🔥 WAJIB

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
});
app.use("/api/", limiter);

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/episodes", episodeRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Dreamlight API");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Dreamlight API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Multer error handler
app.use(handleMulterError);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await db.authenticate();
    console.log("✓ Database connected successfully");

    // Sync database models (use { force: true } only in development to drop tables)
    // await db.sync({ alter: true });
    console.log("✓ Database models synchronized");

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("✗ Unable to start server:", error);
    process.exit(1);
  }
};

// Only start server if not in serverless environment (Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

module.exports = app;
