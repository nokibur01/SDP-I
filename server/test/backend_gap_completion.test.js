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

async function runGapCompletionTests() {
  console.log("\n=======================================================");
  console.log("   BATCHHUB BACKEND GAP COMPLETION: INTEGRATION TESTS");
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

  const student1Token = jwt.sign({ id: 1, role: "student", batch: "3rd Year" }, JWT_SECRET);
  const student2Token = jwt.sign({ id: 2, role: "student", batch: "3rd Year" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin", batch: "3rd Year" }, JWT_SECRET);

  // 1. Task Update (PUT /api/tasks/:taskId)
  console.log("--- 1. Task Update Workflow ---");
  let testTaskId = null;
  try {
    const uniqueSuffix = Date.now();
    const taskRes = await axios.post(
      `${API_BASE}/tasks`,
      {
        title: `Gap Task ${uniqueSuffix}`,
        description: "Initial task description",
        course_code: "CSE320",
        due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
        priority: "Medium",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    testTaskId = taskRes.data.taskId;

    // Student 2 attempts to edit task created by CR/User 1 -> 403
    try {
      await axios.put(
        `${API_BASE}/tasks/${testTaskId}`,
        { title: "Hacked Title" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Unauthorized student cannot edit task (should be 403)");
    } catch (err) {
      assert(err.response?.status === 403, "Unauthorized student edit is rejected with 403 Forbidden");
    }

    // Owner (CR/User 1) edits task -> 200
    const updateRes = await axios.put(
      `${API_BASE}/tasks/${testTaskId}`,
      { title: `Updated Gap Task ${uniqueSuffix}`, priority: "High" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(updateRes.status === 200 && updateRes.data?.success === true, "Task owner successfully updates task details");
  } catch (err) {
    assert(false, `Task update failed: ${err.message}`);
  }

  // 2. Event Update & Delete (PUT / DELETE /api/events/:eventId)
  console.log("--- 2. Event Edit & Delete Workflow ---");
  let testEventId = null;
  try {
    const uniqueSuffix = Date.now();
    const eventRes = await axios.post(
      `${API_BASE}/events`,
      {
        title: `Gap Event ${uniqueSuffix}`,
        description: "Initial event description",
        event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        location: "Room 402",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    testEventId = eventRes.data.eventId;

    // Student 2 attempts to edit event -> 403
    try {
      await axios.put(
        `${API_BASE}/events/${testEventId}`,
        { title: "Hacked Event" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Unauthorized student cannot edit event (should be 403)");
    } catch (err) {
      assert(err.response?.status === 403, "Unauthorized student event edit is rejected with 403 Forbidden");
    }

    // Event creator (CR) edits event -> 200
    const editEventRes = await axios.put(
      `${API_BASE}/events/${testEventId}`,
      { title: `Refined Gap Event ${uniqueSuffix}`, location: "Auditorium" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(editEventRes.status === 200 && editEventRes.data?.success === true, "Event creator updates event metadata");

    // Student 2 attempts to delete event -> 403
    try {
      await axios.delete(
        `${API_BASE}/events/${testEventId}`,
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Unauthorized student cannot delete event (should be 403)");
    } catch (err) {
      assert(err.response?.status === 403, "Unauthorized student event delete is rejected with 403 Forbidden");
    }

    // CR deletes event -> 200
    const deleteEventRes = await axios.delete(
      `${API_BASE}/events/${testEventId}`,
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(deleteEventRes.status === 200 && deleteEventRes.data?.success === true, "Event creator successfully deletes event");
  } catch (err) {
    assert(false, `Event edit/delete failed: ${err.message}`);
  }

  // 3. Project Update (PUT /api/projects/:projectId)
  console.log("--- 3. Project Update Workflow ---");
  let testProjectId = null;
  try {
    const uniqueSuffix = Date.now();
    const projRes = await axios.post(
      `${API_BASE}/projects`,
      {
        title: `Gap Project ${uniqueSuffix}`,
        description: "Initial project description",
        tech_stack: "React, Node, MySQL",
        repo_url: "https://github.com/example/gap",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    testProjectId = projRes.data.projectId;

    // Student 2 attempts to edit Student 1's project -> 403
    try {
      await axios.put(
        `${API_BASE}/projects/${testProjectId}`,
        { title: "Hijacked Project" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Non-owner cannot edit project (should be 403)");
    } catch (err) {
      assert(err.response?.status === 403, "Non-owner project update is rejected with 403 Forbidden");
    }

    // Owner (Student 1) edits project -> 200
    const editProjRes = await axios.put(
      `${API_BASE}/projects/${testProjectId}`,
      {
        title: `Updated Gap Project ${uniqueSuffix}`,
        tech_stack: "React 19, TypeScript, Express, MySQL",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    assert(editProjRes.status === 200 && editProjRes.data?.success === true, "Project owner successfully updates project details");

    // Clean up project
    await axios.delete(`${API_BASE}/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
  } catch (err) {
    assert(false, `Project update failed: ${err.message}`);
  }

  // 4. Resource Delete (DELETE /api/resources/:materialId)
  console.log("--- 4. Resource Delete Workflow ---");
  let testMaterialId = null;
  try {
    const uploadRes = await axios.post(
      `${API_BASE}/resources`,
      {
        title: "Algorithms Cheat Sheet",
        file_url: "https://example.com/algorithms.pdf",
        category: "Cheatsheet",
        course_code: "CSE320",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    testMaterialId = uploadRes.data.materialId;

    // Student 2 attempts to delete Student 1's material -> 403
    try {
      await axios.delete(
        `${API_BASE}/resources/${testMaterialId}`,
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Non-uploader cannot delete material (should be 403)");
    } catch (err) {
      assert(err.response?.status === 403, "Non-uploader resource deletion is rejected with 403 Forbidden");
    }

    // CR deletes material -> 200
    const delRes = await axios.delete(
      `${API_BASE}/resources/${testMaterialId}`,
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(delRes.status === 200 && delRes.data?.success === true, "Staff/Owner deletes resource successfully");
  } catch (err) {
    assert(false, `Resource delete failed: ${err.message}`);
  }

  // 5. Academic Routine & Course Delete (DELETE /api/academic/routine/:id, DELETE /api/academic/courses/:id)
  console.log("--- 5. Academic Routine & Course Management ---");
  try {
    // Add Routine slot
    const routineRes = await axios.post(
      `${API_BASE}/academic/routine`,
      {
        batch: "3rd Year",
        day_of_week: "Monday",
        time_slot: "11:30 AM - 01:00 PM",
        course_name: "Compiler Design",
        room_number: "Lab 305", // Verifying room_number fallback
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(routineRes.status === 201, "CR adds routine slot accepting room_number alias");

    // Add Course
    const courseRes = await axios.post(
      `${API_BASE}/academic/courses`,
      {
        course_code: "CSE321",
        course_title: "Compiler Design Lab",
        department: "CSE",
        batch: "3rd Year",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(courseRes.status === 201, "CR adds semester course successfully");

    // Fetch routine and courses to find IDs
    const academicData = await axios.get(`${API_BASE}/academic`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    const routineSlot = academicData.data.routine.find((r) => r.course_name === "Compiler Design");
    const courseItem = academicData.data.courses.find((c) => c.course_code === "CSE321");

    assert(Boolean(routineSlot), "New routine slot appears in academic data");
    assert(Boolean(courseItem), "New course appears in semester courses data");

    // Student attempts to delete routine -> 403
    if (routineSlot) {
      try {
        await axios.delete(`${API_BASE}/academic/routine/${routineSlot.id}`, {
          headers: { Authorization: `Bearer ${student2Token}` },
        });
        assert(false, "Student cannot delete routine slot (should be 403)");
      } catch (err) {
        assert(err.response?.status === 403, "Student deleting routine is blocked with 403 Forbidden");
      }

      // CR deletes routine slot -> 200
      const delRoutineRes = await axios.delete(`${API_BASE}/academic/routine/${routineSlot.id}`, {
        headers: { Authorization: `Bearer ${crToken}` },
      });
      assert(delRoutineRes.status === 200, "CR successfully deletes routine slot");
    }

    // CR deletes course -> 200
    if (courseItem) {
      const delCourseRes = await axios.delete(`${API_BASE}/academic/courses/${courseItem.id}`, {
        headers: { Authorization: `Bearer ${crToken}` },
      });
      assert(delCourseRes.status === 200, "CR successfully deletes semester course");
    }
  } catch (err) {
    assert(false, `Academic routine/course operations failed: ${err.message}`);
  }

  // Clean up test task if still existing
  if (testTaskId) {
    try {
      await axios.delete(`${API_BASE}/tasks/${testTaskId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    } catch (e) {}
  }

  console.log("\n=======================================================");
  console.log(`TOTAL BACKEND GAP TESTS: ${passed + failed}`);
  console.log(`PASSED:                  ${passed}`);
  console.log(`FAILED:                  ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runGapCompletionTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
