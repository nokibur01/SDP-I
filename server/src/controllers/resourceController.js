import db from "../config/db.js";
import { createNotification } from "./notificationController.js";
import { visibleBatchClause, moderationClause, canSeeBatch, canModerateBatch, batchForNewContent } from "../utils/batchScope.js";

// Get all approved materials + pending materials for CR panel + student's own submissions
export const getResources = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const visible = visibleBatchClause(req.user, "m.batch");
    const moderation = moderationClause(req.user, "m.batch");

    // Fetch approved materials for the user's batch (+ global)
    const [materials] = await db.execute(
      `SELECT m.*, u.name as uploader_name, sc.course_title 
       FROM materials m 
       LEFT JOIN users u ON m.uploaded_by = u.id 
       LEFT JOIN semester_courses sc ON m.course_code = sc.course_code
       WHERE m.status = 'approved' AND ${visible.sql}
       ORDER BY m.created_at DESC`,
      visible.params
    );

    // Fetch pending materials for CR/Admin review
    let pendingMaterials = [];
    if (role === "cr" || role === "admin") {
      const [pMaterials] = await db.execute(
        `SELECT m.*, u.name as uploader_name, sc.course_title 
         FROM materials m 
         LEFT JOIN users u ON m.uploaded_by = u.id 
         LEFT JOIN semester_courses sc ON m.course_code = sc.course_code
         WHERE m.status = 'pending' AND ${moderation.sql}
         ORDER BY m.created_at DESC`,
        moderation.params
      );
      pendingMaterials = pMaterials;
    }

    // Uploader submission status history (pending, approved, rejected)
    const [mySubmissions] = await db.execute(
      `SELECT m.*, u.name as reviewer_name, sc.course_title
       FROM materials m
       LEFT JOIN users u ON m.reviewed_by = u.id
       LEFT JOIN semester_courses sc ON m.course_code = sc.course_code
       WHERE m.uploaded_by = ?
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, materials, pendingMaterials, mySubmissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upload Material (CR = auto-approved, Student = pending)
export const uploadResource = async (req, res) => {
  try {
    const { course_code, title, file_url, category } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Resource title is required." });
    }

    if (!file_url || typeof file_url !== "string" || file_url.trim() === "") {
      return res.status(400).json({ success: false, message: "Resource link / URL is required." });
    }

    // CRs and Admins bypass approval; students require approval
    const status = role === "cr" || role === "admin" ? "approved" : "pending";
    const msg =
      status === "approved"
        ? "Resource uploaded successfully!"
        : "Resource uploaded and submitted for CR approval!";

    const [result] = await db.execute(
      "INSERT INTO materials (course_code, title, file_url, category, status, uploaded_by, batch) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        course_code ? course_code.trim() : "General",
        title.trim(),
        file_url.trim(),
        category || "Lecture Notes",
        status,
        userId,
        batchForNewContent(req.user, req.body.batch),
      ]
    );

    res.status(201).json({ success: true, message: msg, materialId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR / Admin: Approve Material
export const approveResource = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const { materialId } = req.params;
    const reviewerId = req.user.id;

    const [materials] = await db.execute("SELECT id, title, uploaded_by, batch FROM materials WHERE id = ?", [materialId]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }
    if (!canModerateBatch(req.user, materials[0].batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's resources." });
    }

    await db.execute(
      'UPDATE materials SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [reviewerId, materialId]
    );

    // Cross-Module Notification: notify uploader
    if (materials[0].uploaded_by) {
      await createNotification({
        userId: materials[0].uploaded_by,
        type: "resource",
        title: "📚 Study Material Approved",
        message: `Your resource "${materials[0].title}" has been approved and published to the batch library!`,
        relatedEntityType: "resource",
        relatedEntityId: Number(materialId),
      });
    }

    res.status(200).json({ success: true, message: "Resource approved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR / Admin: Reject Material (Preserves moderation history, audit log & uploader visibility)
export const rejectResource = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const { materialId } = req.params;
    const reviewerId = req.user.id;
    const rejectionReason = req.body?.reason || req.body?.rejection_reason || "Declined by batch representative.";

    const [materials] = await db.execute("SELECT id, title, uploaded_by, batch FROM materials WHERE id = ?", [materialId]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }
    if (!canModerateBatch(req.user, materials[0].batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's resources." });
    }

    // Preserve the submission record with status 'rejected' and audit details
    await db.execute(
      'UPDATE materials SET status = "rejected", reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?',
      [reviewerId, rejectionReason, materialId]
    );

    // Cross-Module Notification: notify uploader
    if (materials[0].uploaded_by) {
      await createNotification({
        userId: materials[0].uploaded_by,
        type: "resource",
        title: "Study Material Update",
        message: `Your submitted resource "${materials[0].title}" was declined: ${rejectionReason}`,
        relatedEntityType: "resource",
        relatedEntityId: Number(materialId),
      });
    }

    res.status(200).json({
      success: true,
      message: "Resource submission declined and moderation history preserved.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Resource (Uploader or CR/Admin)
export const updateResource = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, file_url, category, course_code } = req.body;

    const [materials] = await db.execute("SELECT id, title, uploaded_by, batch FROM materials WHERE id = ?", [materialId]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    const isOwner = materials[0].uploaded_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, materials[0].batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to edit this resource.",
      });
    }

    await db.execute(
      `UPDATE materials 
       SET title = COALESCE(?, title),
           file_url = COALESCE(?, file_url),
           category = COALESCE(?, category),
           course_code = COALESCE(?, course_code)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        file_url ? file_url.trim() : null,
        category ? category.trim() : null,
        course_code ? course_code.trim() : null,
        materialId,
      ]
    );

    res.status(200).json({ success: true, message: "Resource updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Resource (Uploader or CR/Admin)
export const deleteResource = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [materials] = await db.execute("SELECT id, title, uploaded_by, batch FROM materials WHERE id = ?", [materialId]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    const isOwner = materials[0].uploaded_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, materials[0].batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete this resource.",
      });
    }

    await db.execute("DELETE FROM materials WHERE id = ?", [materialId]);

    res.status(200).json({ success: true, message: "Resource deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
