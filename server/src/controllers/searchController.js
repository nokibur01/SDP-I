import db from "../config/db.js";
import { visibleBatchClause, normBatch, isStaffRole } from "../utils/batchScope.js";

// GET /api/search?q=keyword
export const globalSearch = async (req, res) => {
  try {
    const rawQuery = req.query.q;
    if (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
      return res.status(200).json({
        success: true,
        query: "",
        results: {
          students: [],
          events: [],
          announcements: [],
          resources: [],
          projects: [],
          tasks: [],
        },
        totalCount: 0,
      });
    }

    const keyword = rawQuery.trim();
    const searchPattern = `%${keyword}%`;
    const userRole = req.user.role;
    const isStaff = userRole === "cr" || userRole === "admin";
    const evVis = visibleBatchClause(req.user, "batch");
    const resVis = visibleBatchClause(req.user, "m.batch");
    const taskVis = visibleBatchClause(req.user, "t.batch");
    const callerBatch = normBatch(req.user.batch);

    // 1. Search Students (Sanitized: NO password, only public directory fields)
    const [students] = await db.execute(
      `SELECT id, name, email, student_id, batch, department, role, profile_picture, skills
       FROM users
       WHERE name LIKE ? OR student_id LIKE ? OR skills LIKE ?
       ORDER BY name ASC
       LIMIT 8`,
      [searchPattern, searchPattern, searchPattern]
    );
    // Same privacy rule as the members directory: emails only for staff, leadership, or your own batch
    for (const s of students) {
      const sameBatch = callerBatch && normBatch(s.batch) === callerBatch;
      if (!isStaff && !sameBatch && !isStaffRole(s)) s.email = null;
    }

    // 2. Search Events (Students see only approved events; CR/Admin see all)
    let eventQuery = `
      SELECT id, title, description, event_date, location, department, status 
      FROM events 
      WHERE (title LIKE ? OR description LIKE ? OR location LIKE ?) AND ${evVis.sql}
    `;
    const eventParams = [searchPattern, searchPattern, searchPattern, ...evVis.params];

    if (!isStaff) {
      eventQuery += " AND status = 'approved'";
    }
    eventQuery += " ORDER BY event_date ASC LIMIT 8";
    const [events] = await db.execute(eventQuery, eventParams);

    // 3. Search Announcements (Notices)
    const [announcements] = await db.execute(
      `SELECT n.id, n.title, n.description, n.category, n.is_pinned, n.priority, n.created_at, u.name as author_name
       FROM notices n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE (n.title LIKE ? OR n.description LIKE ? OR n.category LIKE ?)
         AND (? = 1 OR n.target_audience IS NULL OR LOWER(TRIM(n.target_audience)) IN ('', 'all') OR LOWER(TRIM(n.target_audience)) = ?)
       ORDER BY n.is_pinned DESC, n.created_at DESC
       LIMIT 8`,
      [searchPattern, searchPattern, searchPattern, userRole === "admin" ? 1 : 0, callerBatch]
    );

    // 4. Search Resources (Materials) - Students see only approved
    let resourceQuery = `
      SELECT m.id, m.title, m.course_code, m.category, m.file_url, m.status, m.created_at, u.name as uploader_name
      FROM materials m
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE (m.title LIKE ? OR m.course_code LIKE ? OR m.category LIKE ?) AND ${resVis.sql}
    `;
    const resourceParams = [searchPattern, searchPattern, searchPattern, ...resVis.params];

    if (!isStaff) {
      resourceQuery += " AND m.status = 'approved'";
    }
    resourceQuery += " ORDER BY m.created_at DESC LIMIT 8";
    const [resources] = await db.execute(resourceQuery, resourceParams);

    // 5. Search Projects
    const [projects] = await db.execute(
      `SELECT p.id, p.title, p.description, p.tech_stack, p.repo_url, p.team_members, p.department, u.name as publisher_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.title LIKE ? OR p.tech_stack LIKE ? OR p.description LIKE ?
       ORDER BY p.created_at DESC
       LIMIT 8`,
      [searchPattern, searchPattern, searchPattern]
    );

    // 6. Search Tasks (Students see approved tasks; CR/Admin see all)
    let taskQuery = `
      SELECT t.id, t.title, t.description, t.course_code, t.due_date, t.priority, t.status, u.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.title LIKE ? OR t.description LIKE ? OR t.course_code LIKE ?) AND ${taskVis.sql}
    `;
    const taskParams = [searchPattern, searchPattern, searchPattern, ...taskVis.params];

    if (!isStaff) {
      taskQuery += " AND t.status = 'approved'";
    }
    taskQuery += " ORDER BY t.due_date ASC LIMIT 8";
    const [tasks] = await db.execute(taskQuery, taskParams);

    const totalCount =
      students.length +
      events.length +
      announcements.length +
      resources.length +
      projects.length +
      tasks.length;

    res.status(200).json({
      success: true,
      query: keyword,
      results: {
        students,
        events,
        announcements,
        resources,
        projects,
        tasks,
      },
      totalCount,
    });
  } catch (error) {
    console.error("Global Search Error:", error.message);
    res.status(500).json({ success: false, message: "Search service unavailable." });
  }
};

