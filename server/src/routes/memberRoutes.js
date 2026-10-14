import express from "express";
import { getAllMembers } from "../controllers/memberController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", verifyToken, getAllMembers);

export default router;
