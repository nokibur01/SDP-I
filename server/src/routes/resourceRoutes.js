import express from "express";
import {
  getResources,
  uploadResource,
  approveResource,
  rejectResource,
} from "../controllers/resourceController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", verifyToken, getResources);
router.post("/", verifyToken, uploadResource);
router.put("/:materialId/approve", verifyToken, approveResource);
router.delete("/:materialId/reject", verifyToken, rejectResource);

export default router;
