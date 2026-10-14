import express from "express";
import {
  getTasks,
  createTask,
  deleteTask,
  getPendingTasks,
  approveTask,
  rejectTask,
} from "../controllers/taskController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getTasks);
router.get("/pending", verifyToken, getPendingTasks);
router.post("/", verifyToken, createTask);
router.put("/:taskId/approve", verifyToken, approveTask);
router.delete("/:taskId/reject", verifyToken, rejectTask);
router.delete("/:taskId", verifyToken, deleteTask);

export default router;
