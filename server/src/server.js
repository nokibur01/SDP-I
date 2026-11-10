import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import academicRoutes from "./routes/academicRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Critical Environment Validation
const isProduction = process.env.NODE_ENV === "production";
const REQUIRED_ENV_VARS = ["JWT_SECRET", "DB_NAME", "DB_USER"];
if (isProduction) {
  REQUIRED_ENV_VARS.push("DB_PASSWORD");
}

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v] || process.env[v].trim() === "");
if (missingVars.length > 0) {
  console.error(`FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missingVars.join(", ")}`);
  console.error("Please configure them in server/.env before starting the server.");
  process.exit(1);
}

// Insecure Secret Check (Prevent default or trivial secrets)
const jwtSecret = process.env.JWT_SECRET.trim();
const minLength = isProduction ? 32 : 16;
if (
  jwtSecret.length < minLength ||
  jwtSecret === "secret_key" ||
  jwtSecret === "your_jwt_secret" ||
  jwtSecret === "replace_with_a_long_random_secret_at_least_32_chars"
) {
  console.error(`FATAL SECURITY ERROR: JWT_SECRET is missing, default, or under ${minLength} characters in ${isProduction ? 'production' : 'development'}. Startup aborted.`);
  process.exit(1);
}

const app = express();

// Security: Configurable CORS Origins (allow explicit production origins, fallback to localhost in dev)
const customOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      // Check configured allowlist
      if (customOrigins.includes(origin)) return callback(null, true);

      // Always allow local development and preview instances
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      callback(new Error("CORS policy violation"));
    },
    credentials: true,
  })
);

// Payload size limit: avatars are downsized client-side and capped at ~1.5 MB server-side
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

// Global Error Handler (Prevents stack traces or internal details leaking to client)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  if (err.message === "CORS policy violation") {
    return res.status(403).json({ success: false, message: "Origin not allowed by CORS." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request is too large. Please use a smaller file." });
  }
  res.status(500).json({ success: false, message: "Internal server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});
