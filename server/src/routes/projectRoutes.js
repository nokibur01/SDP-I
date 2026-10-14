import express from "express";
import {
  getProjects,
  createProject,
  joinProject,
  approveJoinRequest,
  rejectJoinRequest,
} from "../controllers/projectController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", verifyToken, getProjects);
router.post("/", verifyToken, createProject);
router.post("/:projectId/join", verifyToken, joinProject);
router.put("/requests/:requestId/approve", verifyToken, approveJoinRequest);
router.delete("/requests/:requestId/reject", verifyToken, rejectJoinRequest);

export default router;
