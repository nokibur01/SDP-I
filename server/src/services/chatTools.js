// BatchHub Assistant data tools.
//
// These are the ONLY ways the AI model can read BatchHub data. Each tool:
//   - takes the authenticated user from the server (never from the model or client),
//   - applies the same role / batch rules as the normal API controllers,
//   - returns a small, read-only, sanitised result (no passwords, no avatars).
// The model can choose which tool to call and pass simple filters; it never
// writes SQL and cannot reach anything outside these functions.

import db from "../config/db.js";
import {
  visibleBatchClause,
  moderationClause,
  normBatch,
  isAdmin,
  isStaffRole,
} from "../utils/batchScope.js";

const MAX_ROWS = 15;

const clampLimit = (value, fallback = 10) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_ROWS);
};

const cleanText = (value, max = 80) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const shorten = (text, max = 220) => {
  if (!text) return "";
  const t = String(text).trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

const iso = (d) => (d ? new Date(d).toISOString() : null);

// ----------------------------------------------------------------------------
// Tool implementations
// ----------------------------------------------------------------------------

async function getMyTasks(user, args = {}) {
  const visible = visibleBatchClause(user, "t.batch");
  const status = ["pending", "completed", "all"].includes(args.status) ? args.status : "pending";
  const days = Number(args.due_within_days);

  let sql = `
    SELECT t.id, t.title, t.description, t.course_code, t.due_date, t.priority,
           CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed
    FROM tasks t
    LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = ?
    WHERE t.status = 'approved' AND ${visible.sql}`;
  const params = [user.id, ...visible.params];

  if (status === "pending") sql += " AND tc.id IS NULL";
  if (status === "completed") sql += " AND tc.id IS NOT NULL";
  if (Number.isFinite(days) && days > 0) {
    sql += " AND t.due_date <= DATE_ADD(NOW(), INTERVAL ? DAY)";
    params.push(Math.min(Math.trunc(days), 365));
  }
  sql += ` ORDER BY t.due_date ASC LIMIT ${MAX_ROWS}`;

  const [rows] = await db.execute(sql, params);
  const now = Date.now();
  return {
    count: rows.length,
    tasks: rows.map((t) => ({
      title: t.title,
      course_code: t.course_code,
      due_date: iso(t.due_date),
      priority: t.priority,
      completed: Boolean(t.is_completed),
      overdue: !t.is_completed && new Date(t.due_date).getTime() < now,
      description: shorten(t.description),
    })),
  };
}

async function getUpcomingEvents(user, args = {}) {
  const visible = visibleBatchClause(user, "e.batch");
  const [rows] = await db.execute(
    `SELECT e.title, e.description, e.event_date, e.location, u.name AS organizer
     FROM events e
     LEFT JOIN users u ON e.created_by = u.id
     WHERE e.status = 'approved' AND e.event_date >= NOW() AND ${visible.sql}
     ORDER BY e.event_date ASC
     LIMIT ${clampLimit(args.limit)}`,
    visible.params
  );
  return {
    count: rows.length,
    events: rows.map((e) => ({
      title: e.title,
      date: iso(e.event_date),
      location: e.location,
      organizer: e.organizer,
      description: shorten(e.description),
    })),
  };
}

async function getRecentAnnouncements(user, args = {}) {
  const scoped = !isAdmin(user);
  const [rows] = await db.execute(
    `SELECT n.title, n.description, n.category, n.priority, n.is_pinned, n.target_audience,
            n.created_at, u.name AS author
     FROM notices n
     LEFT JOIN users u ON n.created_by = u.id
     ${scoped ? "WHERE (n.target_audience IS NULL OR LOWER(TRIM(n.target_audience)) IN ('', 'all') OR LOWER(TRIM(n.target_audience)) = ?)" : ""}
     ORDER BY n.is_pinned DESC, n.created_at DESC
     LIMIT ${clampLimit(args.limit, 8)}`,
    scoped ? [normBatch(user.batch)] : []
  );
  return {
    count: rows.length,
    announcements: rows.map((n) => ({
      title: n.title,
      category: n.category,
      priority: n.priority,
      pinned: Boolean(n.is_pinned),
      posted_at: iso(n.created_at),
      author: n.author,
      body: shorten(n.description, 400),
    })),
  };
}

async function getResources(user, args = {}) {
  const visible = visibleBatchClause(user, "m.batch");
  const course = cleanText(args.course_code, 30);
  const search = cleanText(args.search);

  let sql = `
    SELECT m.title, m.course_code, m.category, m.file_url, m.created_at, u.name AS uploader
    FROM materials m
    LEFT JOIN users u ON m.uploaded_by = u.id
    WHERE m.status = 'approved' AND ${visible.sql}`;
  const params = [...visible.params];
  if (course) {
    sql += " AND m.course_code LIKE ?";
    params.push(`%${course}%`);
  }
  if (search) {
    sql += " AND (m.title LIKE ? OR m.category LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY m.created_at DESC LIMIT ${MAX_ROWS}`;

  const [rows] = await db.execute(sql, params);
  return {
    count: rows.length,
    resources: rows.map((m) => ({
      title: m.title,
      course_code: m.course_code,
      category: m.category,
      link: m.file_url,
      uploaded_by: m.uploader,
      uploaded_at: iso(m.created_at),
    })),
  };
}

async function getProjects(user, args = {}) {
  const search = cleanText(args.search);
  const mineOnly = args.mine_only === true;

  let sql = `
    SELECT p.id, p.title, p.description, p.tech_stack, p.course_context, p.repo_url, u.name AS owner,
           (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
           (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = ?)) AS is_mine
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1`;
  const params = [user.id, user.id];
  if (search) {
    sql += " AND (p.title LIKE ? OR p.tech_stack LIKE ? OR p.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (mineOnly) {
    sql += " AND (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm3 WHERE pm3.project_id = p.id AND pm3.user_id = ?))";
    params.push(user.id, user.id);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT ${MAX_ROWS}`;

  const [rows] = await db.execute(sql, params);
  return {
    count: rows.length,
    projects: rows.map((p) => ({
      title: p.title,
      owner: p.owner,
      tech_stack: p.tech_stack,
      course: p.course_context,
      members: Number(p.member_count),
      i_am_involved: Boolean(p.is_mine),
      repo_url: p.repo_url,
      description: shorten(p.description),
    })),
  };
}

async function getMembers(user, args = {}) {
  const search = cleanText(args.search);
  const role = ["student", "cr", "admin"].includes(args.role) ? args.role : "";
  const ownBatchOnly = args.my_batch_only !== false; // default: the user's own batch

  let sql = "SELECT id, name, email, student_id, batch, department, role, skills FROM users WHERE 1=1";
  const params = [];
  if (ownBatchOnly && user.batch) {
    sql += " AND LOWER(TRIM(batch)) = ?";
    params.push(normBatch(user.batch));
  }
  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }
  if (search) {
    sql += " AND (name LIKE ? OR skills LIKE ? OR student_id LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY name ASC LIMIT ${MAX_ROWS}`;

  const [rows] = await db.execute(sql, params);
  const callerBatch = normBatch(user.batch);
  const callerDept = normBatch(user.department);

  return {
    count: rows.length,
    note: "Emails are only included where BatchHub's directory privacy rules allow it.",
    members: rows.map((m) => {
      // Same field-level privacy rule as the Members directory
      const sameCohort =
        callerBatch && callerDept && normBatch(m.batch) === callerBatch && normBatch(m.department) === callerDept;
      const canViewEmail = m.id === user.id || isStaffRole(user) || isStaffRole(m) || sameCohort;
      return {
        name: m.name,
        role: m.role,
        batch: m.batch,
        department: m.department,
        student_id: m.student_id,
        skills: m.skills,
        email: canViewEmail ? m.email : null,
      };
    }),
  };
}

async function getMyProfile(user) {
  const [rows] = await db.execute(
    "SELECT name, email, student_id, batch, department, role, skills, gender, created_at FROM users WHERE id = ?",
    [user.id]
  );
  if (rows.length === 0) return { error: "Profile not found." };
  const p = rows[0];
  return { ...p, created_at: iso(p.created_at) };
}

async function getClassRoutine(user, args = {}) {
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const day = days.find((d) => d.toLowerCase() === cleanText(args.day, 12).toLowerCase());

  let sql = "SELECT day_of_week, time_slot, course_name, room_no FROM routines WHERE LOWER(TRIM(batch)) = ?";
  const params = [normBatch(user.batch)];
  if (day) {
    sql += " AND day_of_week = ?";
    params.push(day);
  }
  sql += ' ORDER BY FIELD(day_of_week, "Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"), time_slot LIMIT 60';

  const [rows] = await db.execute(sql, params);
  return { batch: user.batch, count: rows.length, classes: rows };
}

// CR / Admin only -------------------------------------------------------------
async function getPendingApprovals(user) {
  if (!isStaffRole(user)) return { error: "Not permitted: only CRs and admins can view the moderation queue." };

  const t = moderationClause(user, "t.batch");
  const e = moderationClause(user, "e.batch");
  const m = moderationClause(user, "m.batch");

  const [tasks] = await db.execute(
    `SELECT t.title, t.course_code, t.due_date, u.name AS submitted_by
     FROM tasks t LEFT JOIN users u ON t.created_by = u.id
     WHERE t.status = 'pending' AND ${t.sql} ORDER BY t.created_at DESC LIMIT ${MAX_ROWS}`,
    t.params
  );
  const [events] = await db.execute(
    `SELECT e.title, e.event_date, e.location, u.name AS submitted_by
     FROM events e LEFT JOIN users u ON e.created_by = u.id
     WHERE e.status = 'pending' AND ${e.sql} ORDER BY e.created_at DESC LIMIT ${MAX_ROWS}`,
    e.params
  );
  const [resources] = await db.execute(
    `SELECT m.title, m.course_code, m.category, u.name AS submitted_by
     FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id
     WHERE m.status = 'pending' AND ${m.sql} ORDER BY m.created_at DESC LIMIT ${MAX_ROWS}`,
    m.params
  );

  return {
    pending_tasks: tasks.map((x) => ({ ...x, due_date: iso(x.due_date) })),
    pending_events: events.map((x) => ({ ...x, event_date: iso(x.event_date) })),
    pending_resources: resources,
  };
}

// Admin only ------------------------------------------------------------------
async function getPlatformStats(user) {
  if (!isAdmin(user)) return { error: "Not permitted: only admins can view platform statistics." };

  const [[counts]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM users)     AS users,
       (SELECT COUNT(*) FROM notices)   AS announcements,
       (SELECT COUNT(*) FROM materials) AS resources,
       (SELECT COUNT(*) FROM tasks)     AS tasks,
       (SELECT COUNT(*) FROM events)    AS events,
       (SELECT COUNT(*) FROM projects)  AS projects`
  );
  const [roles] = await db.query("SELECT role, COUNT(*) AS count FROM users GROUP BY role");
  const [batches] = await db.query(
    "SELECT batch, COUNT(*) AS members FROM users GROUP BY batch ORDER BY members DESC LIMIT 20"
  );
  return {
    totals: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
    users_by_role: Object.fromEntries(roles.map((r) => [r.role, Number(r.count)])),
    users_by_batch: batches.map((b) => ({ batch: b.batch, members: Number(b.members) })),
  };
}

// ----------------------------------------------------------------------------
// Registry: declaration (what the model sees) + handler + who may use it
// ----------------------------------------------------------------------------
const TOOLS = [
  {
    roles: ["student", "cr", "admin"],
    handler: getMyTasks,
    declaration: {
      name: "getMyTasks",
      description:
        "Get the signed-in user's academic tasks/deadlines for their batch, with their personal completion status.",
      parameters: {
        type: "OBJECT",
        properties: {
          status: {
            type: "STRING",
            enum: ["pending", "completed", "all"],
            description: "Which tasks to return. Defaults to pending (not yet completed).",
          },
          due_within_days: {
            type: "INTEGER",
            description: "Only tasks due within this many days from now (e.g. 7 for 'this week'). Includes overdue tasks.",
          },
        },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getUpcomingEvents,
    declaration: {
      name: "getUpcomingEvents",
      description: "Get upcoming approved events visible to the signed-in user, soonest first.",
      parameters: {
        type: "OBJECT",
        properties: { limit: { type: "INTEGER", description: "Maximum events to return (1-15)." } },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getRecentAnnouncements,
    declaration: {
      name: "getRecentAnnouncements",
      description: "Get the latest announcements/notices visible to the signed-in user (pinned first, then newest).",
      parameters: {
        type: "OBJECT",
        properties: { limit: { type: "INTEGER", description: "Maximum announcements to return (1-15)." } },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getResources,
    declaration: {
      name: "getResources",
      description: "Get approved study resources/materials (lecture notes, slides, links) available to the user.",
      parameters: {
        type: "OBJECT",
        properties: {
          course_code: { type: "STRING", description: "Filter by course code, e.g. CSE-3205." },
          search: { type: "STRING", description: "Keyword to match in the resource title or category." },
        },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getProjects,
    declaration: {
      name: "getProjects",
      description: "Get student projects published on BatchHub, optionally only those the user owns or is a member of.",
      parameters: {
        type: "OBJECT",
        properties: {
          search: { type: "STRING", description: "Keyword to match in title, tech stack or description." },
          mine_only: { type: "BOOLEAN", description: "True to return only projects the user owns or has joined." },
        },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getMembers,
    declaration: {
      name: "getMembers",
      description:
        "Search the member directory (name, role, batch, department, skills). Emails are included only where privacy rules allow. Useful for finding the CR or teammates with a skill.",
      parameters: {
        type: "OBJECT",
        properties: {
          search: { type: "STRING", description: "Name, skill or student ID to search for." },
          role: { type: "STRING", enum: ["student", "cr", "admin"], description: "Filter by role." },
          my_batch_only: {
            type: "BOOLEAN",
            description: "Defaults to true (only the user's own batch). Set false to search all batches.",
          },
        },
      },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getMyProfile,
    declaration: {
      name: "getMyProfile",
      description: "Get the signed-in user's own profile (name, email, student ID, batch, department, role, skills).",
      parameters: { type: "OBJECT", properties: {} },
    },
  },
  {
    roles: ["student", "cr", "admin"],
    handler: getClassRoutine,
    declaration: {
      name: "getClassRoutine",
      description: "Get the weekly class routine/timetable for the signed-in user's batch.",
      parameters: {
        type: "OBJECT",
        properties: { day: { type: "STRING", description: "Optional day of week, e.g. Monday." } },
      },
    },
  },
  {
    roles: ["cr", "admin"],
    handler: getPendingApprovals,
    declaration: {
      name: "getPendingApprovals",
      description:
        "CR/Admin only: get tasks, events and resources that students submitted and are waiting for approval.",
      parameters: { type: "OBJECT", properties: {} },
    },
  },
  {
    roles: ["admin"],
    handler: getPlatformStats,
    declaration: {
      name: "getPlatformStats",
      description: "Admin only: platform-wide totals (users, tasks, events, resources...) and users by role/batch.",
      parameters: { type: "OBJECT", properties: {} },
    },
  },
];

/** Tool declarations this user's role is allowed to use (what gets sent to the model). */
export const getToolDeclarationsFor = (user) =>
  TOOLS.filter((t) => t.roles.includes(user.role)).map((t) => t.declaration);

/**
 * Run a tool on behalf of the authenticated user. The role check is repeated here,
 * so even if the model asks for a tool it was never offered, it is refused.
 */
export const executeTool = async (user, name, args) => {
  const tool = TOOLS.find((t) => t.declaration.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  if (!tool.roles.includes(user.role)) {
    return { error: "Not permitted: your role cannot access this information." };
  }
  try {
    return await tool.handler(user, args && typeof args === "object" ? args : {});
  } catch (err) {
    console.error(`Chat tool ${name} failed:`, err.message);
    return { error: "This BatchHub data could not be loaded right now." };
  }
};

/** Human-readable label for a tool, used to show the user where an answer came from. */
export const TOOL_LABELS = {
  getMyTasks: "Tasks",
  getUpcomingEvents: "Events",
  getRecentAnnouncements: "Announcements",
  getResources: "Resources",
  getProjects: "Projects",
  getMembers: "Members",
  getMyProfile: "Profile",
  getClassRoutine: "Class routine",
  getPendingApprovals: "Pending approvals",
  getPlatformStats: "Platform stats",
};
