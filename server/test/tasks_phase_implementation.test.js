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

async function runTaskPhaseTests() {
  console.log("\n=======================================================");
  console.log("   SDP-I TASKS PAGE: COMPREHENSIVE IMPLEMENTATION TESTS");
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

  const timestamp = Date.now();
  const { CR_ID, ADMIN_ID } = await resolveRoleIds();
  const studentToken = jwt.sign({ id: 1, role: "student", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const studentBToken = jwt.sign({ id: 2, role: "student", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin", batch: "3rd Year", department: "CSE" }, JWT_SECRET);

  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 19).replace("T", " ");

  let studentTaskId = null;

  // 1. Student task submission (pending status)
  console.log("--- 1. Student Task Submission & Pending Status ---");
  try {
    const res = await axios.post(
      `${API_BASE}/tasks`,
      {
        title: `Algorithms Lab Milestone ${timestamp}`,
        course_code: "CSE-3101",
        priority: "High",
        due_date: futureDate,
        description: "Submit dynamic programming problem sets",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    studentTaskId = res.data.taskId;
    assert(res.status === 201 && res.data.success, "Student task submission succeeds with HTTP 201");
    assert(res.data.message.includes("review"), "Student submission message confirms pending CR review");
  } catch (err) {
    assert(false, `Student task submission failed: ${err.response?.data?.message || err.message}`);
  }

  // 2. Student pending submission visibility & privacy isolation
  console.log("\n--- 2. Student Pending Visibility & Privacy Isolation ---");
  try {
    const resA = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resA.status === 200, "Student A GET /api/tasks returns HTTP 200");
    assert(Array.isArray(resA.data.myPendingTasks), "Response includes myPendingTasks array");
    const foundMyTask = resA.data.myPendingTasks.find((t) => t.id === studentTaskId);
    assert(Boolean(foundMyTask), "Student A sees their own pending submission in myPendingTasks");
    assert(resA.data.pendingTasks.length === 0, "Student A cannot view global pending moderation queue (pendingTasks is empty)");

    // Student B should NOT see Student A's pending task
    const resB = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    const foundByB = (resB.data.myPendingTasks || []).find((t) => t.id === studentTaskId);
    assert(!foundByB, "Student B NEVER sees Student A's private pending task");
  } catch (err) {
    assert(false, `Student pending visibility test failed: ${err.message}`);
  }

  // 3. Security: Student cannot approve or reject
  console.log("\n--- 3. Role Authorization Guard (Student Blocked) ---");
  try {
    await axios.put(`${API_BASE}/tasks/${studentTaskId}/approve`, {}, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(false, "Student approve should have failed with 403");
  } catch (err) {
    assert(err.response?.status === 403, "Student PUT /api/tasks/:id/approve is blocked with 403 Forbidden");
  }

  try {
    await axios.delete(`${API_BASE}/tasks/${studentTaskId}/reject`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(false, "Student reject should have failed with 403");
  } catch (err) {
    assert(err.response?.status === 403, "Student DELETE /api/tasks/:id/reject is blocked with 403 Forbidden");
  }

  // 4. Duplicate submission prevention
  console.log("\n--- 4. Duplicate Submission Prevention ---");
  try {
    await axios.post(
      `${API_BASE}/tasks`,
      {
        title: `Algorithms Lab Milestone ${timestamp}`,
        course_code: "CSE-3101",
        priority: "High",
        due_date: futureDate,
        description: "Duplicate attempt",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(false, "Duplicate task submission should be rejected with 409 Conflict");
  } catch (err) {
    assert(err.response?.status === 409, "Duplicate task submission is rejected with HTTP 409 Conflict");
  }

  // 5. CR can approve task & moderation queue visibility
  console.log("\n--- 5. CR Moderation Workflow ---");
  try {
    const crRes = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    assert(Array.isArray(crRes.data.pendingTasks), "CR receives pendingTasks moderation queue");
    const foundByCR = crRes.data.pendingTasks.find((t) => t.id === studentTaskId);
    assert(Boolean(foundByCR), "CR can see Student's pending task in moderation queue");

    // CR approves task
    const approveRes = await axios.put(
      `${API_BASE}/tasks/${studentTaskId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(approveRes.status === 200, "CR PUT /api/tasks/:id/approve succeeds with HTTP 200");

    // Verify task now appears in public approved tasks list
    const publicRes = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const approvedInList = publicRes.data.tasks.find((t) => t.id === studentTaskId);
    assert(Boolean(approvedInList), "Approved task now appears in active batch tasks list");
  } catch (err) {
    assert(false, `CR Moderation workflow failed: ${err.message}`);
  }

  // 6. Admin can reject tasks
  console.log("\n--- 6. Admin Moderation (Reject Workflow) ---");
  let adminRejectTaskId = null;
  try {
    // Create another pending task
    const createRes = await axios.post(
      `${API_BASE}/tasks`,
      {
        title: `Flawed Homework Submission ${timestamp}`,
        course_code: "CSE-3999",
        priority: "Low",
        due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 19).replace("T", " "),
        description: "Needs rejection test",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    adminRejectTaskId = createRes.data.taskId;

    // Admin rejects task
    const rejectRes = await axios.delete(`${API_BASE}/tasks/${adminRejectTaskId}/reject`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(rejectRes.status === 200, "Admin DELETE /api/tasks/:id/reject succeeds with HTTP 200");

    // Verify rejected task is not in approved list
    const checkRes = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const foundRejected = checkRes.data.tasks.find((t) => t.id === adminRejectTaskId);
    assert(!foundRejected, "Rejected task is not published to approved batch tasks list");
  } catch (err) {
    assert(false, `Admin moderation failed: ${err.message}`);
  }

  // 7. Individual Task Completion Tracking
  console.log("\n--- 7. Individual Task Completion Tracking ---");
  try {
    // Student A marks studentTaskId completed
    const compResA = await axios.post(
      `${API_BASE}/tasks/${studentTaskId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(compResA.status === 200, "Student A marks task completed");

    // Student A verifies is_completed = 1
    const listResA = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const taskForA = listResA.data.tasks.find((t) => t.id === studentTaskId);
    assert(Number(taskForA?.is_completed) === 1, "Task shows is_completed = 1 for Student A");

    // Student B verifies is_completed = 0 for themselves
    const listResB = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    const taskForB = listResB.data.tasks.find((t) => t.id === studentTaskId);
    assert(Number(taskForB?.is_completed) === 0, "Task shows is_completed = 0 for Student B (completion state is strictly isolated)");

    // Student A uncompletes the task
    const uncompRes = await axios.delete(`${API_BASE}/tasks/${studentTaskId}/complete`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(uncompRes.status === 200, "Student A uncompletes the task");

    const recheckResA = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const taskUncompleted = recheckResA.data.tasks.find((t) => t.id === studentTaskId);
    assert(Number(taskUncompleted?.is_completed) === 0, "Task shows is_completed = 0 for Student A after uncompleting");
  } catch (err) {
    assert(false, `Individual task completion tracking failed: ${err.message}`);
  }

  // Cleanup: Creator deletes test task
  try {
    await axios.delete(`${API_BASE}/tasks/${studentTaskId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
  } catch (e) {}

  console.log("\n=======================================================");
  console.log(`TOTAL TASKS TESTS: ${passed + failed}`);
  console.log(`PASSED:            ${passed}`);
  console.log(`FAILED:            ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

runTaskPhaseTests();
