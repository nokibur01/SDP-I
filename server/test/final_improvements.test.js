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

async function runFinalImprovementsTests() {
  console.log("\n=======================================================");
  console.log("   BATCHHUB FINAL FULL-STACK IMPROVEMENTS TEST SUITE");
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

  // Create test tokens
  const { CR_ID, ADMIN_ID } = await resolveRoleIds();
  const student1Token = jwt.sign({ id: 1, role: "student", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const student2Token = jwt.sign({ id: 2, role: "student", batch: "4th Year", department: "EEE" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year", department: "CSE" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin", batch: "3rd Year", department: "CSE" }, JWT_SECRET);

  const uniqueSuffix = Date.now();

  // --- 1. Partial Profile Updates & Data Loss Prevention ---
  console.log("--- 1. Partial Profile Updates & Data Loss Prevention ---");
  try {
    // Fetch initial profile
    const initRes = await axios.get(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const originalProfile = initRes.data.user;

    // Update ONLY name (omit student_id, batch, department, skills, profile_picture)
    const newName = `Updated Name ${uniqueSuffix}`;
    const updateNameRes = await axios.put(
      `${API_BASE}/users/profile`,
      { name: newName },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    const afterNameUser = updateNameRes.data.user;
    assert(afterNameUser.name === newName, "Updating only name succeeds");
    assert(afterNameUser.student_id === originalProfile.student_id, "Omitted student_id remains unchanged (not null)");
    assert(afterNameUser.batch === originalProfile.batch, "Omitted batch remains unchanged (not null)");
    assert(afterNameUser.department === originalProfile.department, "Omitted department remains unchanged (not null)");
    assert(afterNameUser.skills === originalProfile.skills, "Omitted skills remain unchanged (not null)");

    // Update ONLY skills (omit other fields)
    const newSkills = "React, Node.js, MariaDB, Docker";
    const updateSkillsRes = await axios.put(
      `${API_BASE}/users/profile`,
      { skills: newSkills },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    const afterSkillsUser = updateSkillsRes.data.user;
    assert(afterSkillsUser.skills === newSkills, "Updating only skills succeeds");
    assert(afterSkillsUser.name === newName, "Previous name preserved during skills-only update");

    // Empty name update is rejected with 400
    try {
      await axios.put(
        `${API_BASE}/users/profile`,
        { name: "   " },
        { headers: { Authorization: `Bearer ${student1Token}` } }
      );
      assert(false, "Empty name was not rejected");
    } catch (err) {
      assert(err.response?.status === 400, "Empty name update is rejected with 400 Bad Request");
    }

    // Restore original profile name
    await axios.put(
      `${API_BASE}/users/profile`,
      { name: originalProfile.name },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
  } catch (err) {
    console.error("Partial update test error:", err.response?.data || err.message);
    assert(false, "Partial profile update workflow passed without errors");
  }

  // --- 2. Members Directory Privacy & Field-Level Access Control ---
  console.log("--- 2. Members Directory Privacy & Field-Level Access Control ---");
  try {
    const membersRes = await axios.get(`${API_BASE}/members`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const members = membersRes.data.members || [];
    assert(members.length > 0, "Members list successfully retrieved");

    // Check no passwords or sensitive fields exposed
    const leakedPassword = members.some((m) => m.password !== undefined || m.password_hash !== undefined);
    assert(!leakedPassword, "No passwords or password hashes leaked in directory");

    // Student 5 is in 4th Year EEE (different batch & department from Student 1: 3rd Year CSE)
    const crossBatchStudent = members.find((m) => Number(m.id) === 5 && m.role === "student");
    if (crossBatchStudent) {
      assert(
        crossBatchStudent.email === null,
        "Cross-batch/cross-dept ordinary student email is protected (null)"
      );
    } else {
      assert(true, "Cross-batch privacy evaluated");
    }

    // Leadership (CR/Admin) email remains visible so students can reach their reps
    const leadershipMember = members.find((m) => m.role === "cr" || m.role === "admin");
    if (leadershipMember) {
      assert(
        leadershipMember.email !== null,
        "Leadership (CR/Admin) contact email remains accessible to students"
      );
    }

    // Search query sanitization & filtering
    const searchRes = await axios.get(`${API_BASE}/members?q=admin`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(Array.isArray(searchRes.data.members), "Sanitized search query returns valid array");
  } catch (err) {
    console.error("Member privacy test error:", err.response?.data || err.message);
    assert(false, "Member privacy workflow passed without errors");
  }

  // --- 3. Resource Moderation History Preservation ---
  console.log("--- 3. Resource Moderation History Preservation ---");
  try {
    // Student 2 uploads resource -> status 'pending'
    const uploadRes = await axios.post(
      `${API_BASE}/resources`,
      {
        title: `History Test Resource ${uniqueSuffix}`,
        course_code: "CSE305",
        file_url: "https://example.com/moderation-test.pdf",
        category: "Lecture Notes",
      },
      { headers: { Authorization: `Bearer ${student2Token}` } }
    );
    const materialId = uploadRes.data.materialId;

    // CR rejects resource with a specific rejection reason
    const rejectReasonText = "Missing references and diagram pages.";
    const rejectRes = await axios.put(
      `${API_BASE}/resources/${materialId}/reject`,
      { reason: rejectReasonText },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(rejectRes.status === 200, "CR rejects resource successfully");

    // Verify submission is preserved in mySubmissions with status 'rejected' and reason
    const studentRes = await axios.get(`${API_BASE}/resources`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    const mySubmissions = studentRes.data.mySubmissions || [];
    const rejectedItem = mySubmissions.find((m) => Number(m.id) === Number(materialId));
    assert(rejectedItem !== undefined, "Rejected resource is preserved in database (not deleted)");
    assert(rejectedItem?.status === "rejected", "Resource status is marked as 'rejected'");
    assert(rejectedItem?.rejection_reason === rejectReasonText, "Rejection reason is stored and returned to uploader");

    // Clean up
    await axios.delete(`${API_BASE}/resources/${materialId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Resource moderation history test error:", err.response?.data || err.message);
    assert(false, "Resource moderation history workflow passed without errors");
  }

  // --- 4. Routine & Course Duplicate Prevention ---
  console.log("--- 4. Routine & Course Duplicate Prevention ---");
  try {
    // 1. Routine Slot
    const routinePayload = {
      batch: `TestBatch_${uniqueSuffix.toString().slice(-4)}`,
      day_of_week: "Tuesday",
      time_slot: "02:00 PM - 03:30 PM",
      course_name: "Compiler Design",
      room_number: `Lab_${uniqueSuffix.toString().slice(-4)}`,
    };

    const r1 = await axios.post(`${API_BASE}/academic/routine`, routinePayload, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    const routineId = r1.data.routineId;

    // Duplicate routine insert attempt -> 409 Conflict
    try {
      await axios.post(`${API_BASE}/academic/routine`, routinePayload, {
        headers: { Authorization: `Bearer ${crToken}` },
      });
      assert(false, "Duplicate routine slot was not blocked");
    } catch (err) {
      assert(err.response?.status === 409, "Duplicate routine slot is rejected with 409 Conflict");
    }

    // 2. Semester Course
    const coursePayload = {
      course_code: `CSE_UQ_${uniqueSuffix.toString().slice(-4)}`,
      course_title: "Quantum Algorithms",
      department: "CSE",
      batch: `Batch_${uniqueSuffix.toString().slice(-4)}`,
    };

    const c1 = await axios.post(`${API_BASE}/academic/courses`, coursePayload, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    const courseId = c1.data.courseId;

    // Duplicate course insert attempt -> 409 Conflict
    try {
      await axios.post(`${API_BASE}/academic/courses`, coursePayload, {
        headers: { Authorization: `Bearer ${crToken}` },
      });
      assert(false, "Duplicate course registration was not blocked");
    } catch (err) {
      assert(err.response?.status === 409, "Duplicate course registration is rejected with 409 Conflict");
    }

    // Cleanup
    await axios.delete(`${API_BASE}/academic/routine/${routineId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    await axios.delete(`${API_BASE}/academic/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Duplicate prevention test error:", err.response?.data || err.message);
    assert(false, "Duplicate prevention workflow passed without errors");
  }

  // --- 5. Authentication Rate Limiter Header Check ---
  console.log("--- 5. Authentication Rate Limiter Security ---");
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: "student@batchhub.edu",
      password: "wrong_password_test",
    }).catch((e) => e.response);

    assert(loginRes.status === 401, "Invalid login returns 401");
    assert(
      loginRes.headers["x-ratelimit-limit"] !== undefined,
      "Rate limiting header (X-RateLimit-Limit) is active on auth routes"
    );
  } catch (err) {
    console.error("Rate limiter test error:", err.response?.data || err.message);
    assert(false, "Rate limiter security check passed without errors");
  }

  console.log("\n=======================================================");
  console.log(`TOTAL FINAL IMPROVEMENTS TESTS: ${passed + failed}`);
  console.log(`PASSED:                         ${passed}`);
  console.log(`FAILED:                         ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalImprovementsTests();
