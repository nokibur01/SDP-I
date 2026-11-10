import express from "express";
import { chat } from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Protects the Gemini quota from abuse (reuses the project's existing rate limiter)
const chatLimiter = createRateLimiter({
  windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT_MAX) || 20,
  message: "You're sending messages too quickly. Please wait a moment and try again.",
  keyPrefix: "chat",
});

// BatchHub Assistant: signed-in users only. Role and batch rules are applied inside the data tools.
router.post("/", verifyToken, chatLimiter, chat);

export default router;
