import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Get all users / members
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get all notices
router.get("/notices", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM notices ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notices" });
  }
});

// Get all materials / resources
router.get("/materials", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM materials ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching materials" });
  }
});

// Get all tasks
router.get("/tasks", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tasks ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

// Get all events
router.get("/events", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM events ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching events" });
  }
});

// Get all projects
router.get("/projects", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM projects ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// Role Update
router.put("/admin/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    await db.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      req.params.id,
    ]);
    res.json({ message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

// Universal Delete
router.delete("/admin/:tab/:id", async (req, res) => {
  const { tab, id } = req.params;
  const tableNames = {
    students: "users",
    notices: "notices",
    resources: "materials",
    tasks: "tasks",
    events: "events",
    projects: "projects",
  };
  const table = tableNames[tab];
  if (!table) return res.status(400).json({ message: "Invalid category" });

  try {
    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete record" });
  }
});

export default router;
