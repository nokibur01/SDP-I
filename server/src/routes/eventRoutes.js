import express from "express";
import {
  getEvents,
  createEvent,
  approveEvent,
  rejectEvent,
} from "../controllers/eventController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", verifyToken, getEvents);
router.post("/", verifyToken, createEvent);
router.put("/:eventId/approve", verifyToken, approveEvent);
router.delete("/:eventId/reject", verifyToken, rejectEvent);

export default router;
