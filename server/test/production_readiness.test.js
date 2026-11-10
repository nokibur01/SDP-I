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

async function runProductionReadinessTests() {
  console.log("\n=======================================================");
  console.log("   BATCHHUB PRODUCTION READINESS: INTEGRATION TESTS");
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

  // Create JWT tokens for testing
  const { CR_ID, ADMIN_ID } = await resolveRoleIds();
  const student1Token = jwt.sign({ id: 1, role: "student", batch: "3rd Year" }, JWT_SECRET);
  const student2Token = jwt.sign({ id: 2, role: "student", batch: "3rd Year" }, JWT_SECRET);
  const crToken = jwt.sign({ id: CR_ID, role: "cr", batch: "3rd Year" }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin", batch: "3rd Year" }, JWT_SECRET);

  const uniqueSuffix = Date.now();

  // --- 1. Project Invitation Acceptance & Relational Integrity ---
  console.log("--- 1. Project Invitation Acceptance & Relational Integrity ---");
  try {
    // Student 1 creates a project
    const projRes = await axios.post(
      `${API_BASE}/projects`,
      {
        title: `Invite Test Proj ${uniqueSuffix}`,
        description: "Testing invitation acceptance",
        tech_stack: "Node.js, React",
        repo_url: "https://github.com/example/invite-test",
        department: "CSE",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    const projectId = projRes.data.projectId;

    // Student 1 invites Student 2 (user id 2)
    const inviteRes = await axios.post(
      `${API_BASE}/projects/${projectId}/invite`,
      {
        user_id: 2,
        message: "Join my awesome project team!",
      },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    const inviteId = inviteRes.data.invitationId;

    // Student 2 retrieves projects and inspects incoming invitations
    const s2ProjectsRes = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    const incoming = s2ProjectsRes.data.incomingInvitations || [];
    const foundInvite = incoming.find((inv) => Number(inv.request_id || inv.id) === Number(inviteId));
    assert(
      foundInvite !== undefined && Number(foundInvite.project_id) === Number(projectId),
      "Student 2 receives project invitation in incomingInvitations"
    );

    // Student 1 (not the invitee) tries to accept Student 2's invitation -> 403 Forbidden
    try {
      await axios.put(
        `${API_BASE}/projects/invitations/${inviteId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${student1Token}` } }
      );
      assert(false, "Student 1 unauthorized acceptance was not blocked");
    } catch (err) {
      assert(err.response?.status === 403, "Unauthorized user cannot accept someone else's invitation (403)");
    }

    // Student 2 accepts the invitation
    const acceptRes = await axios.put(
      `${API_BASE}/projects/invitations/${inviteId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${student2Token}` } }
    );
    assert(acceptRes.status === 200, "Student 2 accepts invitation successfully");

    // Verify Student 2 is now in project members
    const projDetail = await axios.get(`${API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const isMember = (projDetail.data.members || []).some((m) => Number(m.user_id) === 2);
    assert(isMember, "Student 2 is now listed in project_members roster");

    // --- 2. Project Member Removal Workflow ---
    console.log("--- 2. Project Member Removal Workflow ---");
    // Unauthorized user attempts to remove member
    try {
      const student3Token = jwt.sign({ id: 3, role: "student", batch: "3rd Year" }, JWT_SECRET);
      await axios.delete(`${API_BASE}/projects/${projectId}/members/2`, {
        headers: { Authorization: `Bearer ${student3Token}` },
      });
      assert(false, "Unauthorized user member removal was not blocked");
    } catch (err) {
      assert(err.response?.status === 403, "Non-owner/non-admin cannot remove project members (403)");
    }

    // Project owner removes Student 2
    const removeRes = await axios.delete(`${API_BASE}/projects/${projectId}/members/2`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(removeRes.status === 200, "Project owner successfully removes member");

    // Verify Student 2 is no longer in project members
    const projDetailAfter = await axios.get(`${API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const stillMember = (projDetailAfter.data.members || []).some((m) => Number(m.user_id) === 2);
    assert(!stillMember, "Student 2 has been removed from project_members");

    // Clean up project
    await axios.delete(`${API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
  } catch (err) {
    console.error("Project invitation flow error:", err.response?.data || err.message);
    assert(false, "Project invitation workflow completed without errors");
  }

  // --- 3. Academic Routine & Course Updates ---
  console.log("--- 3. Academic Routine & Course Updates ---");
  try {
    // CR creates a routine slot
    const routineRes = await axios.post(
      `${API_BASE}/academic/routine`,
      {
        day_of_week: "Monday",
        course_name: `Software Eng ${uniqueSuffix}`,
        time_slot: "09:00 AM - 10:30 AM",
        room_number: "Lab 401",
        batch: "3rd Year",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    const routineId = routineRes.data.routineId;

    // Student tries to update routine -> 403 Forbidden
    try {
      await axios.put(
        `${API_BASE}/academic/routine/${routineId}`,
        { room_number: "Lab 505" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Student routine update was not blocked");
    } catch (err) {
      assert(err.response?.status === 403, "Student updating routine is blocked with 403 Forbidden");
    }

    // CR updates routine slot
    const updateRoutineRes = await axios.put(
      `${API_BASE}/academic/routine/${routineId}`,
      { room_number: "Lab 505", time_slot: "10:30 AM - 12:00 PM" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(updateRoutineRes.status === 200, "CR successfully updates routine slot");

    // CR creates a course
    const courseRes = await axios.post(
      `${API_BASE}/academic/courses`,
      {
        course_code: `CSE999_${uniqueSuffix.toString().slice(-4)}`,
        course_title: "Advanced Distributed Systems",
        department: "CSE",
        batch: "3rd Year",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    const courseId = courseRes.data.courseId;

    // Student tries to update course -> 403 Forbidden
    try {
      await axios.put(
        `${API_BASE}/academic/courses/${courseId}`,
        { course_title: "Hacked Course" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Student course update was not blocked");
    } catch (err) {
      assert(err.response?.status === 403, "Student updating course is blocked with 403 Forbidden");
    }

    // CR updates course
    const updateCourseRes = await axios.put(
      `${API_BASE}/academic/courses/${courseId}`,
      { course_title: "Advanced Cloud Architecture" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(updateCourseRes.status === 200, "CR successfully updates semester course");

    // Cleanup routine & course
    await axios.delete(`${API_BASE}/academic/routine/${routineId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
    await axios.delete(`${API_BASE}/academic/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Academic update flow error:", err.response?.data || err.message);
    assert(false, "Academic update workflow completed without errors");
  }

  // --- 4. Resource Metadata Update & Security ---
  console.log("--- 4. Resource Metadata Update & Security ---");
  try {
    // CR uploads a resource
    const resRes = await axios.post(
      `${API_BASE}/resources`,
      {
        title: `Resource To Update ${uniqueSuffix}`,
        course_code: "CSE401",
        file_url: "https://example.com/lecture1.pdf",
        category: "Lecture Notes",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    const materialId = resRes.data.materialId;

    // Student 2 tries to update resource -> 403 Forbidden
    try {
      await axios.put(
        `${API_BASE}/resources/${materialId}`,
        { title: "Defaced Title" },
        { headers: { Authorization: `Bearer ${student2Token}` } }
      );
      assert(false, "Unauthorized resource update was not blocked");
    } catch (err) {
      assert(err.response?.status === 403, "Unauthorized student updating resource is blocked with 403");
    }

    // CR updates resource
    const updateRes = await axios.put(
      `${API_BASE}/resources/${materialId}`,
      { title: `Updated Resource Title ${uniqueSuffix}`, category: "Assignment Reference" },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    assert(updateRes.status === 200, "Uploader successfully updates resource metadata");

    // Cleanup resource
    await axios.delete(`${API_BASE}/resources/${materialId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Resource update flow error:", err.response?.data || err.message);
    assert(false, "Resource update workflow completed without errors");
  }

  // --- 5. Notification Deletion Workflow ---
  console.log("--- 5. Notification Deletion Workflow ---");
  try {
    // Create an announcement which triggers a notification
    const noticeRes = await axios.post(
      `${API_BASE}/notices`,
      {
        title: `Notification Notice ${uniqueSuffix}`,
        description: "Notice to generate notification for deletion test",
        department: "CSE",
        target_audience: "all",
        category: "general",
        priority: "Normal",
      },
      { headers: { Authorization: `Bearer ${crToken}` } }
    );
    const noticeId = noticeRes.data.noticeId;

    // Fetch notifications for Student 2
    const notifRes = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    const notifs = notifRes.data.notifications || [];
    assert(notifs.length > 0, "Student 2 has received notifications");

    const targetNotif = notifs[0];

    // Student 1 attempts to delete Student 2's notification -> 403 or 404 (isolated)
    try {
      await axios.delete(`${API_BASE}/notifications/${targetNotif.id}`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert(false, "Cross-user notification deletion was not blocked");
    } catch (err) {
      assert(
        err.response?.status === 403 || err.response?.status === 404,
        "Cross-user notification deletion is blocked with 403 or 404"
      );
    }

    // Student 2 deletes their own notification
    const deleteNotifRes = await axios.delete(`${API_BASE}/notifications/${targetNotif.id}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(deleteNotifRes.status === 200, "Student 2 deletes notification successfully");

    // Cleanup notice
    await axios.delete(`${API_BASE}/notices/${noticeId}`, {
      headers: { Authorization: `Bearer ${crToken}` },
    });
  } catch (err) {
    console.error("Notification deletion flow error:", err.response?.data || err.message);
    assert(false, "Notification deletion workflow completed without errors");
  }

  console.log("\n=======================================================");
  console.log(`TOTAL PRODUCTION READINESS TESTS: ${passed + failed}`);
  console.log(`PASSED:                           ${passed}`);
  console.log(`FAILED:                           ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionReadinessTests();
