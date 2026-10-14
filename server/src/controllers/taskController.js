import db from "../config/db.js";

// Get all approved active tasks
export const getTasks = async (req, res) => {
  try {
    const [tasks] = await db.execute(
      `SELECT t.*, u.name as creator_name 
             FROM tasks t 
             LEFT JOIN users u ON t.created_by = u.id 
             WHERE t.due_date >= NOW() AND t.status = 'approved'
             ORDER BY t.due_date ASC`,
    );

    res.status(200).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Task / Deadline (Students need CR approval, CRs/Admins auto-approve)
export const createTask = async (req, res) => {
  try {
    const { title, description, course_code, due_date, priority, department } =
      req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const status =
      userRole === "cr" || userRole === "admin" ? "approved" : "pending";

    await db.execute(
      "INSERT INTO tasks (title, description, course_code, due_date, priority, department, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        title.trim(),
        description ? description.trim() : "",
        course_code ? course_code.trim() : "General",
        due_date,
        priority || "Medium",
        department ? department.trim() : "CSE",
        userId,
        status,
      ],
    );

    const message =
      status === "pending"
        ? "Task submitted successfully! Awaiting CR approval."
        : "Task deadline added and published successfully!";

    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Pending Tasks (For CR Panel)
export const getPendingTasks = async (req, res) => {
  try {
    const [pendingTasks] = await db.execute(
      `SELECT t.*, u.name as uploader_name 
             FROM tasks t 
             LEFT JOIN users u ON t.created_by = u.id 
             WHERE t.status = 'pending'
             ORDER BY t.due_date ASC`,
    );

    res.status(200).json({ success: true, pendingTasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR Approve Task
export const approveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.execute('UPDATE tasks SET status = "approved" WHERE id = ?', [
      taskId,
    ]);

    res
      .status(200)
      .json({ success: true, message: "Task approved and published!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR Reject Task
export const rejectTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

    res
      .status(200)
      .json({ success: true, message: "Task request rejected and removed." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Complete / Delete Task
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

    res
      .status(200)
      .json({ success: true, message: "Task completed and removed." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
