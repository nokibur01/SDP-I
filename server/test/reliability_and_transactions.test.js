import jwt from "jsonwebtoken";
import { resolveRoleIds } from "./testUsers.js";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "../src/config/db.js";
import { createNotification } from "../src/controllers/notificationController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const API_BASE = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function runReliabilityAndTransactionsTests() {
  console.log("\n=======================================================");
  console.log("   BATCHHUB RELIABILITY & TRANSACTION INTEGRITY TESTS");
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

  const { CR_ID, ADMIN_ID } = await resolveRoleIds();

  const student1Token = jwt.sign({ id: 1, role: "student", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const student2Token = jwt.sign({ id: 2, role: "student", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year", department: "CSE" }, JWT_SECRET);

  const uniqueSuffix = Date.now();

  // --- 1. Transaction Rollback Simulation (Multi-step Atomicity) ---
  console.log("--- 1. Transaction Rollback Simulation (Multi-step Atomicity) ---");
  try {
    // Student 1 creates a project
    const projRes = await axios.post(
      `${API_BASE}/projects`,
      {
        title: `Rollback Test Project ${uniqueSuffix}`,
        description: "Testing transactional rollback",
        tech_stack: "Node.js, MySQL",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    const projectId = projRes.data.projectId;

    // Student 2 creates a join request
    await axios.post(
      `${API_BASE}/projects/${projectId}/join`,
      {},
      { headers: { Authorization: `Bearer ${student2Token}` } }
    );

    // Fetch the pending request ID
    const [reqRows] = await db.execute(
      "SELECT id FROM project_requests WHERE project_id = ? AND user_id = ? AND status = 'pending'",
      [projectId, 2]
    );
    const requestId = reqRows[0].id;

    // Simulate multi-step failure during approval:
    // Update request to 'approved', then encounter an error, and trigger conn.rollback()
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE project_requests SET status = "approved" WHERE id = ?', [requestId]);
      // Simulate fatal error before commit
      throw new Error("Simulated network/database failure mid-transaction");
      // await conn.commit();
    } catch (simulatedErr) {
      await conn.rollback();
    } finally {
      conn.release();
    }

    // Verify state was completely preserved and no partial writes exist
    const [verifiedReq] = await db.execute("SELECT status FROM project_requests WHERE id = ?", [requestId]);
    assert(verifiedReq[0].status === "pending", "Transaction rollback restored request status to 'pending'");

    const [verifiedMember] = await db.execute(
      "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, 2]
    );
    assert(verifiedMember.length === 0, "No partial member record created in project_members");

    // Clean up test project
    await axios.delete(`${API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
  } catch (err) {
    console.error("Transaction test error:", err.response?.data || err.message);
    assert(false, "Transaction rollback simulation passed without unexpected errors");
  }

  // --- 2. Notification Deduplication vs Legitimate Delivery ---
  console.log("--- 2. Notification Deduplication vs Legitimate Delivery ---");
  try {
    const testEntityId = 999000 + Math.floor(Math.random() * 1000);

    // 1. Send first notification for entity
    const notif1 = await createNotification({
      userId: 1,
      type: "task",
      title: "Task Assigned",
      message: "You have been assigned to review Task #1",
      relatedEntityType: "task",
      relatedEntityId: testEntityId,
    });
    assert(notif1 !== null, "Initial notification generated successfully");

    // 2. Concurrently attempt duplicate notification for the EXACT SAME entity
    const notif2 = await createNotification({
      userId: 1,
      type: "task",
      title: "Task Assigned",
      message: "You have been assigned to review Task #1",
      relatedEntityType: "task",
      relatedEntityId: testEntityId,
    });
    assert(notif2 === notif1, "Identical duplicate notification for same entity is deduplicated (suppressed)");

    // 3. Attempt notification for a DIFFERENT entity with same title -> MUST NOT be suppressed!
    const differentEntityId = testEntityId + 1;
    const notif3 = await createNotification({
      userId: 1,
      type: "task",
      title: "Task Assigned",
      message: "You have been assigned to review Task #2",
      relatedEntityType: "task",
      relatedEntityId: differentEntityId,
    });
    assert(
      notif3 !== null && notif3 !== notif1,
      "Legitimate notification for a different entity is delivered (not suppressed)"
    );

    // Clean up created test notifications
    await db.execute("DELETE FROM notifications WHERE id IN (?, ?)", [notif1, notif3]);
  } catch (err) {
    console.error("Notification deduplication test error:", err.message);
    assert(false, "Notification deduplication passed without errors");
  }

  // --- 3. Timetable Physical & Batch Conflict Prevention ---
  console.log("--- 3. Timetable Physical & Batch Conflict Prevention ---");
  try {
    const testRoom = `ConflictRoom_${uniqueSuffix.toString().slice(-4)}`;
    const testBatchA = `BatchA_${uniqueSuffix.toString().slice(-4)}`;
    const testBatchB = `BatchB_${uniqueSuffix.toString().slice(-4)}`;

    // Create Base Routine Slot
    const slot1Res = await axios.post(
      `${API_BASE}/academic/routine`,
      {
        batch: testBatchA,
        day_of_week: "Wednesday",
        time_slot: "11:00 AM - 12:30 PM",
        course_name: "Computer Networks",
        room_number: testRoom,
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    const slot1Id = slot1Res.data.routineId;

    // 1. Room Double-Booking: Different batch attempts same room at same time -> 409
    try {
      await axios.post(
        `${API_BASE}/academic/routine`,
        {
          batch: testBatchB,
          day_of_week: "Wednesday",
          time_slot: "11:00 AM - 12:30 PM",
          course_name: "Database Systems",
          room_number: testRoom,
        },
        { headers: { Authorization: `Bearer ${crToken}` } }
      );
      assert(false, "Physical room conflict was not blocked");
    } catch (err) {
      assert(err.response?.status === 409, "Physical room double-booking rejected with 409 Conflict");
    }

    // 2. Batch Schedule Conflict: Same batch attempts two classes at same time -> 409
    try {
      await axios.post(
        `${API_BASE}/academic/routine`,
        {
          batch: testBatchA,
          day_of_week: "Wednesday",
          time_slot: "11:00 AM - 12:30 PM",
          course_name: "Machine Learning",
          room_number: `AnotherRoom_${uniqueSuffix.toString().slice(-4)}`,
        },
        { headers: { Authorization: `Bearer ${crToken}` } }
      );
      assert(false, "Batch timetable schedule conflict was not blocked");
    } catch (err) {
      assert(err.response?.status === 409, "Batch schedule conflict rejected with 409 Conflict");
    }

    // Clean up
    await axios.delete(`${API_BASE}/academic/routine/${slot1Id}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Timetable conflict test error:", err.response?.data || err.message);
    assert(false, "Timetable conflict tests completed without unexpected errors");
  }

  // --- 4. Security & JWT Validation ---
  console.log("--- 4. Security & JWT Validation ---");
  try {
    // Expired token test
    const expiredToken = jwt.sign(
      { id: 1, role: "student" },
      JWT_SECRET,
      { expiresIn: "0s" } // immediately expired
    );
    try {
      await axios.get(`${API_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert(false, "Expired JWT was not rejected");
    } catch (err) {
      assert(err.response?.status === 401, "Expired JWT is rejected with 401 Unauthorized");
    }

    // Forged signature token
    const forgedToken = jwt.sign({ id: 1, role: "admin" }, "wrong_secret_signature");
    try {
      await axios.get(`${API_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      assert(false, "Forged JWT was not rejected");
    } catch (err) {
      assert(err.response?.status === 401, "Forged JWT signature is rejected with 401 Unauthorized");
    }
  } catch (err) {
    console.error("JWT security test error:", err.response?.data || err.message);
    assert(false, "JWT security test completed without unexpected errors");
  }

  // --- 5. SQL Injection Resilience ---
  console.log("--- 5. SQL Injection Resilience ---");
  try {
    const maliciousPayload = "' OR '1'='1' -- ";
    const searchRes = await axios.get(`${API_BASE}/members?q=${encodeURIComponent(maliciousPayload)}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(searchRes.status === 200, "Parameterized member search handles quotes and SQL tokens safely");
    assert(Array.isArray(searchRes.data.members), "Returns valid array without SQL syntax errors or leaks");
  } catch (err) {
    console.error("SQL injection test error:", err.response?.data || err.message);
    assert(false, "SQL injection resilience test completed without errors");
  }

  console.log("\n=======================================================");
  console.log(`TOTAL RELIABILITY & TRANSACTION TESTS: ${passed + failed}`);
  console.log(`PASSED:                                ${passed}`);
  console.log(`FAILED:                                ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runReliabilityAndTransactionsTests();
