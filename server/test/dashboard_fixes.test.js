import jwt from "jsonwebtoken";
import { resolveRoleIds } from "./testUsers.js";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const API_BASE = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function runDashboardTests() {
  console.log("\n=======================================================");
  console.log("   DASHBOARD IMPROVEMENTS: INTEGRATION & SECURITY TEST");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Role-Based Announcement Authorization
  console.log("--- 1. Role-Based Announcement Security ---");
  const { CR_ID, ADMIN_ID } = await resolveRoleIds();
  const studentToken = jwt.sign({ id: 1, role: "student", batch: "3rd Year" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin", batch: "3rd Year" }, JWT_SECRET);

  try {
    await axios.post(`${API_BASE}/notices`, {
      title: "Student Attempt",
      description: "Should be blocked",
    }, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(false, "Student POST /api/notices must be rejected with 403 Forbidden");
  } catch (err) {
    assert(err.response?.status === 403, "Student POST /api/notices is rejected with 403 Forbidden");
  }

  try {
    const resCr = await axios.post(`${API_BASE}/notices`, {
      title: "CR Authorized Announcement",
      description: "Official batch update from CR",
      priority: "Important",
    }, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    assert(resCr.status === 201 && resCr.data?.success === true, "CR POST /api/notices succeeds with 201 Created");
  } catch (err) {
    assert(false, `CR POST /api/notices failed: ${err.message}`);
  }

  try {
    const resAdmin = await axios.post(`${API_BASE}/notices`, {
      title: "Admin Announcement",
      description: "Official system announcement",
      priority: "Urgent",
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resAdmin.status === 201 && resAdmin.data?.success === true, "Admin POST /api/notices succeeds with 201 Created");
  } catch (err) {
    assert(false, `Admin POST /api/notices failed: ${err.message}`);
  }

  // 2. Tasks API for Academic Flight Deck
  console.log("\n--- 2. Academic Flight Deck Data Integrity ---");
  try {
    const taskRes = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(taskRes.status === 200 && Array.isArray(taskRes.data?.tasks), "GET /api/tasks returns valid array of tasks");
    
    // Check fields needed for deadlines and progress
    const tasks = taskRes.data.tasks;
    if (tasks.length > 0) {
      const first = tasks[0];
      assert(first.due_date !== undefined, "Task includes due_date field for deadline tracking");
      assert(first.is_completed !== undefined, "Task includes user-specific is_completed flag");
    } else {
      assert(true, "Tasks endpoint gracefully handles empty task list");
    }
  } catch (err) {
    assert(false, `GET /api/tasks failed: ${err.message}`);
  }

  // 3. Events API for Calendar & Event Filtering
  console.log("\n--- 3. Events & Calendar Linkage API ---");
  try {
    const eventRes = await axios.get(`${API_BASE}/events`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(eventRes.status === 200 && Array.isArray(eventRes.data?.events), "GET /api/events returns approved events array");
    const events = eventRes.data.events;
    if (events.length > 0) {
      const first = events[0];
      assert(first.event_date !== undefined, "Event includes event_date for calendar day matching");
      assert(first.location !== undefined, "Event includes location metadata");
    }
  } catch (err) {
    assert(false, `GET /api/events failed: ${err.message}`);
  }

  // 4. Notifications API for Unread Announcements Indicator
  console.log("\n--- 4. Unread Notification Integration ---");
  try {
    const notifRes = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(notifRes.status === 200 && typeof notifRes.data?.unreadCount === "number", "GET /api/notifications returns unreadCount number");
  } catch (err) {
    assert(false, `GET /api/notifications failed: ${err.message}`);
  }

  console.log("\n=======================================================");
  console.log(`TOTAL DASHBOARD TESTS: ${passed + failed}`);
  console.log(`PASSED:                ${passed}`);
  console.log(`FAILED:                ${failed}`);
  console.log("=======================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runDashboardTests();

