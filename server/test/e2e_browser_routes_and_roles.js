import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const API_BASE = "http://localhost:5000/api";
const CLIENT_BASE = process.env.CLIENT_BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function runE2ERoutesAndRolesTest() {
  console.log("\n=======================================================");
  console.log("   BATCHHUB COMPLETE E2E ROUTE & 3-ROLE VERIFICATION");
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

  // --- 1. SPA Route Availability on Port 3000 ---
  console.log("--- 1. SPA Production Route Verification (Port 3000) ---");
  const productionRoutes = [
    "/dashboard",
    "/tasks",
    "/events",
    "/announcements",
    "/projects",
    "/resources",
    "/members",
    "/profile",
    "/cr-panel",
    "/showcase", // Should serve SPA index.html which routes/redirects to /dashboard
  ];

  for (const route of productionRoutes) {
    try {
      const res = await axios.get(`${CLIENT_BASE}${route}`);
      assert(
        res.status === 200 && res.data.includes("<div id=\"root\">"),
        `Route ${route} serves valid React 19 SPA shell (HTTP 200)`
      );
    } catch (err) {
      assert(false, `Route ${route} failed with error: ${err.message}`);
    }
  }

  // --- 2. Actual 3-Role Token Setup ---
  console.log("--- 2. Role Permissions & Authorization Testing ---");
  // Fetch actual users from database
  const [dbUsers] = await db.execute("SELECT id, name, email, role, batch, department FROM users");
  const studentUser = dbUsers.find((u) => u.role === "student") || { id: 1, role: "student", batch: "3rd Year", department: "CSE" };
  const crUser = dbUsers.find((u) => u.role === "cr") || { id: 6, role: "cr", batch: "3rd Year", department: "CSE" };
  const adminUser = dbUsers.find((u) => u.role === "admin") || { id: 1, role: "admin", batch: "3rd Year", department: "CSE" };

  const studentToken = jwt.sign({ id: studentUser.id, role: "student", batch: studentUser.batch, department: studentUser.department }, JWT_SECRET);
  const crToken = jwt.sign({ id: crUser.id, role: "cr", batch: crUser.batch, department: crUser.department }, JWT_SECRET);
  const adminToken = jwt.sign({ id: adminUser.id, role: "admin", batch: adminUser.batch, department: adminUser.department }, JWT_SECRET);

  // Student blocked from posting announcement
  try {
    await axios.post(
      `${API_BASE}/notices`,
      { title: "Student Illegal Notice", description: "Should fail", category: "general" },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(false, "Student notice creation was not blocked");
  } catch (err) {
    assert(err.response?.status === 403, "Student cannot post announcements (403 Forbidden)");
  }

  // CR allowed to post announcement
  let testNoticeId = null;
  try {
    const noticeRes = await axios.post(
      `${API_BASE}/notices`,
      { title: `E2E Announcement ${Date.now()}`, description: "Cohort announcement for verification", category: "general" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(noticeRes.status === 201, "CR can post cohort announcements (201 Created)");
    testNoticeId = noticeRes.data.noticeId;
  } catch (err) {
    assert(false, `CR notice creation failed: ${err.message}`);
  }

  // Student blocked from approving tasks
  try {
    await axios.put(
      `${API_BASE}/tasks/1/approve`,
      {},
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(false, "Student task approval was not blocked");
  } catch (err) {
    assert(err.response?.status === 403, "Student cannot approve tasks (403 Forbidden)");
  }

  // Student blocked from registering timetable routine
  try {
    await axios.post(
      `${API_BASE}/academic/routine`,
      { batch: "3rd Year", day_of_week: "Sunday", time_slot: "09:00 AM - 10:30 AM", room_number: "Lab 1", course_name: "Test" },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(false, "Student routine registration was not blocked");
  } catch (err) {
    assert(err.response?.status === 403, "Student cannot register timetable slots (403 Forbidden)");
  }

  // --- 3. Live MySQL Persistence & Mutation Lifecycle ---
  console.log("--- 3. Live MySQL Persistence & Data Retrieval ---");
  try {
    // 1. Academic data returns real database arrays
    const academicRes = await axios.get(`${API_BASE}/academic`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(Array.isArray(academicRes.data.courses), "GET /academic returns courses array from MySQL");
    assert(Array.isArray(academicRes.data.routine), "GET /academic returns routine array from MySQL");

    // 2. Tasks data returns user-specific is_completed status
    const tasksRes = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(Array.isArray(tasksRes.data.tasks), "GET /tasks returns active tasks array from MySQL");

    // 3. Clean up test announcement
    if (testNoticeId) {
      await axios.delete(`${API_BASE}/notices/${testNoticeId}`, {
        headers: { Authorization: `Bearer ${crToken}` },
      });
    }
  } catch (err) {
    console.error("Data verification error:", err.message);
    assert(false, "MySQL persistence checks completed without error");
  }

  console.log("\n=======================================================");
  console.log(`TOTAL E2E ROUTE & ROLE TESTS: ${passed + failed}`);
  console.log(`PASSED:                        ${passed}`);
  console.log(`FAILED:                        ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ERoutesAndRolesTest();
