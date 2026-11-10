import db from "../config/db.js";
import { createNotification, broadcastNotification } from "./notificationController.js";
import { visibleBatchClause, moderationClause, canSeeBatch, canModerateBatch, batchForNewContent } from "../utils/batchScope.js";

// Get all active approved tasks for the user's batch, joined with their individual completion status
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const visible = visibleBatchClause(req.user, "t.batch");
    const moderation = moderationClause(req.user, "t.batch");

    // 1. Fetch approved tasks (own batch + global) with individual student completion flag
    const [tasks] = await db.execute(
      `SELECT t.*, u.name as creator_name,
              CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END as is_completed,
              tc.completed_at
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN task_completions tc ON t.id = tc.task_id AND tc.user_id = ?
       WHERE t.status = 'approved' AND ${visible.sql}
       ORDER BY t.due_date ASC`,
      [userId, ...visible.params]
    );

    // 2. If user is CR or Admin, fetch all pending tasks for moderation
    let pendingTasks = [];
    if (userRole === "cr" || userRole === "admin") {
      const [pTasks] = await db.execute(
        `SELECT t.*, u.name as creator_name, u.student_id as creator_student_id
         FROM tasks t
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.status = 'pending' AND ${moderation.sql}
         ORDER BY t.created_at DESC`,
        moderation.params
      );
      pendingTasks = pTasks;
    }

    // 3. User's own pending submissions (visible to the student who submitted them)
    const [myPendingTasks] = await db.execute(
      `SELECT t.*, u.name as creator_name
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.status = 'pending' AND t.created_by = ?
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, tasks, pendingTasks, myPendingTasks });
  } catch (error) {
    console.error("Get Tasks Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to retrieve tasks." });
  }
};

// Create a new task (CRs/Admins auto-approved, Students require approval)
export const createTask = async (req, res) => {
  try {
    const { title, description, course_code, due_date, priority, department } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }

    if (!due_date) {
      return res.status(400).json({ success: false, message: "Task due date is required." });
    }

    const dueTime = new Date(due_date).getTime();
    if (isNaN(dueTime)) {
      return res.status(400).json({ success: false, message: "Valid submission due date is required." });
    }
    if (dueTime < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: "Submission due date cannot be set in the past." });
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? description.trim() : "";
    const cleanCourse = course_code ? course_code.trim() : "General";
    const cleanPriority = ["Low", "Medium", "High"].includes(priority) ? priority : "Medium";
    const cleanDept = department ? department.trim() : "CSE";

    // Duplicate check: Prevent duplicate task submissions with identical title, course, and deadline
    const [existing] = await db.execute(
      `SELECT id FROM tasks 
       WHERE LOWER(TRIM(title)) = LOWER(?) 
         AND LOWER(TRIM(course_code)) = LOWER(?) 
         AND due_date = ? 
         AND status IN ('pending', 'approved')`,
      [cleanTitle, cleanCourse, due_date]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A task with this title, course code, and deadline already exists or is pending review.",
      });
    }

    // Enforce Approval: CRs/Admins auto-approved, Students pending
    const status = userRole === "cr" || userRole === "admin" ? "approved" : "pending";

    const taskBatch = batchForNewContent(req.user, req.body.batch);

    const [result] = await db.execute(
      `INSERT INTO tasks (title, description, course_code, due_date, priority, department, batch, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanTitle, cleanDesc, cleanCourse, due_date, cleanPriority, cleanDept, taskBatch, status, userId]
    );

    const taskId = result.insertId;

    if (status === "approved") {
      await broadcastNotification({
        batch: taskBatch,
        excludeUserId: userId,
        type: "task",
        title: `📋 New Deadline: ${cleanTitle}`,
        message: `Course: ${cleanCourse} | Due: ${new Date(due_date).toLocaleDateString()}`,
        relatedEntityType: "task",
        relatedEntityId: taskId,
      });
    }

    res.status(201).json({
      success: true,
      message:
        status === "approved"
          ? "Academic task saved successfully!"
          : "Task submitted for Class Representative review.",
      taskId,
    });
  } catch (error) {
    console.error("Create Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create task." });
  }
};

// CR / Admin: Fetch Pending Tasks for Approval
export const getPendingTasks = async (req, res) => {
  try {
    const moderation = moderationClause(req.user, "t.batch");
    const [tasks] = await db.execute(
      `SELECT t.*, u.name as creator_name, u.name as uploader_name, u.student_id as creator_student_id
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.status = 'pending' AND ${moderation.sql}
       ORDER BY t.created_at DESC`,
      moderation.params
    );

    res.status(200).json({ success: true, tasks, pendingTasks: tasks });
  } catch (error) {
    console.error("Get Pending Tasks Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to retrieve pending tasks." });
  }
};

// CR / Admin: Approve Task
export const approveTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [tasks] = await db.execute("SELECT id, status, title, created_by, course_code, due_date, batch FROM tasks WHERE id = ?", [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = tasks[0];
    if (!canModerateBatch(req.user, task.batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's tasks." });
    }
    if (task.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Task is already ${task.status}. Only pending tasks can be approved.`,
      });
    }

    await db.execute('UPDATE tasks SET status = "approved" WHERE id = ?', [taskId]);

    // Cross-Module Notification: notify task creator
    if (task.created_by) {
      await createNotification({
        userId: task.created_by,
        type: "task",
        title: "📋 Task Approved",
        message: `Your task "${task.title}" has been approved and published to the batch deadline list!`,
        relatedEntityType: "task",
        relatedEntityId: Number(taskId),
      });
    }

    // Broadcast to the task's batch
    await broadcastNotification({
      batch: task.batch,
      excludeUserId: task.created_by,
      type: "task",
      title: `📋 New Deadline: ${task.title}`,
      message: `Course: ${task.course_code} | Due: ${new Date(task.due_date).toLocaleDateString()}`,
      relatedEntityType: "task",
      relatedEntityId: Number(taskId),
    });

    res.status(200).json({ success: true, message: "Task approved and published to the batch!" });
  } catch (error) {
    console.error("Approve Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to approve task." });
  }
};

// CR / Admin: Reject Task (Preserves audit trail with status = 'rejected')
export const rejectTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [tasks] = await db.execute("SELECT id, status, title, created_by, batch FROM tasks WHERE id = ?", [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = tasks[0];
    if (!canModerateBatch(req.user, task.batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's tasks." });
    }
    if (task.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Task is already ${task.status}. Only pending tasks can be rejected.`,
      });
    }

    // Preserve audit trail: set status to 'rejected' instead of destructive deletion
    await db.execute('UPDATE tasks SET status = "rejected" WHERE id = ?', [taskId]);

    // Cross-Module Notification: notify task creator
    if (task.created_by) {
      await createNotification({
        userId: task.created_by,
        type: "task",
        title: "Task Submission Update",
        message: `Your submitted task "${task.title}" was declined by the batch representative.`,
        relatedEntityType: "task",
        relatedEntityId: Number(taskId),
      });
    }

    res.status(200).json({ success: true, message: "Task request rejected and recorded." });
  } catch (error) {
    console.error("Reject Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to reject task." });
  }
};

// Update Task (Creator or CR/Admin)
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, description, course_code, due_date, priority, department } = req.body;

    const [tasks] = await db.execute("SELECT id, title, created_by, batch FROM tasks WHERE id = ?", [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const isOwner = tasks[0].created_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, tasks[0].batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to edit this task.",
      });
    }

    await db.execute(
      `UPDATE tasks 
       SET title = COALESCE(?, title), 
           description = COALESCE(?, description), 
           course_code = COALESCE(?, course_code), 
           due_date = COALESCE(?, due_date), 
           priority = COALESCE(?, priority), 
           department = COALESCE(?, department) 
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        course_code ? course_code.trim() : null,
        due_date || null,
        priority || null,
        department || null,
        taskId,
      ]
    );

    res.status(200).json({ success: true, message: "Task updated successfully!" });
  } catch (error) {
    console.error("Update Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update task." });
  }
};

// Delete Task (Strict Ownership Verification)
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [tasks] = await db.execute("SELECT id, created_by, title, batch FROM tasks WHERE id = ?", [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = tasks[0];

    // Ownership Policy: Task creator, CR, or Admin may delete
    const isOwner = task.created_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, task.batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete another student's task.",
      });
    }

    await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

    res.status(200).json({ success: true, message: "Task removed successfully." });
  } catch (error) {
    console.error("Delete Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete task." });
  }
};

// Student: Mark Task Completed (Does NOT delete shared task)
export const completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Check task exists and is approved
    const [tasks] = await db.execute("SELECT id, title, status, batch FROM tasks WHERE id = ?", [taskId]);
    if (tasks.length === 0 || !canSeeBatch(req.user, tasks[0].batch)) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    if (tasks[0].status !== "approved") {
      return res.status(400).json({ success: false, message: "Only approved tasks can be completed." });
    }

    // Insert user completion record
    await db.execute(
      `INSERT INTO task_completions (task_id, user_id) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE completed_at = CURRENT_TIMESTAMP`,
      [taskId, userId]
    );

    res.status(200).json({
      success: true,
      message: `Task marked as completed!`,
    });
  } catch (error) {
    console.error("Complete Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to record task completion." });
  }
};

// Student: Undo Task Completion
export const uncompleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    await db.execute("DELETE FROM task_completions WHERE task_id = ? AND user_id = ?", [taskId, userId]);

    res.status(200).json({
      success: true,
      message: "Task marked as active.",
    });
  } catch (error) {
    console.error("Uncomplete Task Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update task completion." });
  }
};
