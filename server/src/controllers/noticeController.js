import db from "../config/db.js";
import { broadcastNotification } from "./notificationController.js";
import { normBatch, isAdmin, canModerateBatch } from "../utils/batchScope.js";

// A notice's batch is its target_audience; "all" / empty means everyone.
const audienceBatch = (aud) => (aud && normBatch(aud) !== "all" ? aud : null);

// Get all announcements/notices (pinned first, then chronological)
export const getNotices = async (req, res) => {
  try {
    // Everyone sees "all" notices plus those targeted at their own batch; admins see everything.
    const scoped = !isAdmin(req.user);
    const [notices] = await db.execute(
      `SELECT n.*, u.name as author_name
       FROM notices n
       LEFT JOIN users u ON n.created_by = u.id
       ${scoped ? "WHERE (n.target_audience IS NULL OR LOWER(TRIM(n.target_audience)) IN ('', 'all') OR LOWER(TRIM(n.target_audience)) = ?)" : ""}
       ORDER BY n.is_pinned DESC, n.created_at DESC`,
      scoped ? [normBatch(req.user.batch)] : []
    );

    res.status(200).json({ success: true, notices });
  } catch (error) {
    console.error("Get notices error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new announcement/notice (CR and Admin only)
export const createNotice = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== "cr" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only Class Representatives and Administrators can post announcements.",
      });
    }

    const { title, description, category, target_audience, priority, is_pinned } = req.body;
    const userId = req.user.id;
    const isStaff = true;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Announcement title is required." });
    }

    if (!description || typeof description !== "string" || description.trim() === "") {
      return res.status(400).json({ success: false, message: "Announcement description is required." });
    }

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanCat = ["academic", "examination", "event", "general"].includes(category)
      ? category
      : "general";
    // CRs announce to their own batch only; admins may target any batch or "all".
    const cleanAudience = isAdmin(req.user)
      ? (target_audience ? target_audience.trim() : "all")
      : (req.user.batch ? req.user.batch.trim() : "all");
    const cleanPriority = ["Normal", "Important", "Urgent"].includes(priority)
      ? priority
      : "Normal";
    const pinnedVal = isStaff && is_pinned ? 1 : 0;

    const [result] = await db.execute(
      `INSERT INTO notices (title, description, category, target_audience, priority, is_pinned, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanTitle,
        cleanDesc,
        cleanCat,
        cleanAudience,
        cleanPriority,
        pinnedVal,
        userId,
      ]
    );

    const noticeId = result.insertId;

    // Cross-Module Notification: notify students about new announcement
    await broadcastNotification({
      batch: cleanAudience === "all" ? null : cleanAudience,
      excludeUserId: userId,
      type: "announcement",
      title: cleanPriority === "Urgent" ? `🚨 URGENT: ${cleanTitle}` : `📢 ${cleanTitle}`,
      message: cleanDesc.slice(0, 150) + (cleanDesc.length > 150 ? "..." : ""),
      relatedEntityType: "announcement",
      relatedEntityId: noticeId,
    });

    res.status(201).json({
      success: true,
      message: "Announcement posted successfully!",
      noticeId,
    });
  } catch (error) {
    console.error("Create notice error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update an existing notice
export const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, target_audience, priority } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isStaff = userRole === "cr" || userRole === "admin";

    const [existing] = await db.execute("SELECT id, created_by, target_audience FROM notices WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    if (existing[0].created_by !== userId && !(isStaff && canModerateBatch(req.user, audienceBatch(existing[0].target_audience)))) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot edit this announcement." });
    }

    const cleanTitle = title ? title.trim() : undefined;
    const cleanDesc = description ? description.trim() : undefined;
    const cleanCat = category ? category.trim() : undefined;
    const cleanAudience = isAdmin(req.user) && target_audience ? target_audience.trim() : undefined;
    const cleanPriority = priority ? priority.trim() : undefined;

    await db.execute(
      `UPDATE notices 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           target_audience = COALESCE(?, target_audience),
           priority = COALESCE(?, priority)
       WHERE id = ?`,
      [cleanTitle, cleanDesc, cleanCat, cleanAudience, cleanPriority, id]
    );

    res.status(200).json({ success: true, message: "Announcement updated successfully!" });
  } catch (error) {
    console.error("Update notice error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a notice
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isStaff = userRole === "cr" || userRole === "admin";

    const [existing] = await db.execute("SELECT id, created_by, target_audience FROM notices WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    if (existing[0].created_by !== userId && !(isStaff && canModerateBatch(req.user, audienceBatch(existing[0].target_audience)))) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot delete this announcement." });
    }

    await db.execute("DELETE FROM notices WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "Announcement deleted successfully." });
  } catch (error) {
    console.error("Delete notice error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle Pin Status (CR and Admin only)
export const togglePinNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== "cr" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only CRs and Admins can pin announcements." });
    }

    const [existing] = await db.execute("SELECT id, is_pinned, title, target_audience FROM notices WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }
    if (!canModerateBatch(req.user, audienceBatch(existing[0].target_audience))) {
      return res.status(403).json({ success: false, message: "You can only pin announcements for your own batch." });
    }

    const newPinned = existing[0].is_pinned === 1 ? 0 : 1;
    await db.execute("UPDATE notices SET is_pinned = ? WHERE id = ?", [newPinned, id]);

    res.status(200).json({
      success: true,
      is_pinned: newPinned,
      message: newPinned === 1 ? "Announcement pinned to top!" : "Announcement unpinned.",
    });
  } catch (error) {
    console.error("Toggle pin error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
