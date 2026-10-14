import { api } from "../assets/js/api.js";

export function CRPanelView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 900px;";

  const user = JSON.parse(localStorage.getItem("user")) || {
    batch: "3rd Year",
  };

  container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
            <h2 style="color: var(--primary-color); font-size: 24px;">CR & Admin Management Panel</h2>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Manage batch routines, add semester courses, and approve student uploads, events, and tasks.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Add Routine Form -->
            <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px;">Add Routine Slot</h3>
                <form id="addRoutineForm" style="display: flex; flex-direction: column; gap: 12px;">
                    <label style="font-size: 12px; font-weight: 600;">Batch</label>
                    <input type="text" id="rBatch" value="${user.batch}" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    
                    <label style="font-size: 12px; font-weight: 600;">Day of Week</label>
                    <input type="text" id="rDay" placeholder="e.g., Saturday" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    
                    <label style="font-size: 12px; font-weight: 600;">Time Slot</label>
                    <input type="text" id="rTime" placeholder="e.g., 9:00 AM - 10:30 AM" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    
                    <label style="font-size: 12px; font-weight: 600;">Course Name</label>
                    <input type="text" id="rCourse" placeholder="e.g., Operating Systems" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    
                    <label style="font-size: 12px; font-weight: 600;">Room No</label>
                    <input type="text" id="rRoom" placeholder="e.g., Room 402" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    
                    <button type="submit" style="padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 5px;">Add Routine Slot</button>
                </form>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Add Semester Course Form -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                    <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px;">Add Semester Course</h3>
                    <form id="addCourseForm" style="display: flex; flex-direction: column; gap: 12px;">
                        <input type="text" id="cCode" placeholder="Course Code (e.g., CSE-3201)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                        <input type="text" id="cTitle" placeholder="Course Title" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                        <input type="text" id="cDept" placeholder="Department (e.g., CSE)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                        <input type="text" id="cBatch" value="${user.batch}" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                        <button type="submit" style="padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Add Course</button>
                    </form>
                </div>

                <!-- Pending Resource Approvals -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                    <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px;">Pending Resource Approvals</h3>
                    <div id="pendingApprovalsList" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
                        <p style="color: var(--text-muted); font-size: 13px;">Loading pending items...</p>
                    </div>
                </div>

                <!-- Pending Event Approvals -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                    <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px;">Pending Event Approvals</h3>
                    <div id="pendingEventsList" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
                        <p style="color: var(--text-muted); font-size: 13px;">Loading pending events...</p>
                    </div>
                </div>

                <!-- Pending Task Approvals -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                    <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px;">Pending Task Approvals</h3>
                    <div id="pendingTasksList" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
                        <p style="color: var(--text-muted); font-size: 13px;">Loading pending tasks...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

  async function loadPendingApprovals() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/resources", token);
      const pContainer = document.getElementById("pendingApprovalsList");
      if (!pContainer) return;
      pContainer.innerHTML = "";

      if (!res.pendingMaterials || res.pendingMaterials.length === 0) {
        pContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No pending resource approvals.</p>`;
        return;
      }

      res.pendingMaterials.forEach((mat) => {
        const item = document.createElement("div");
        item.style.cssText =
          "display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid var(--border-color);";
        item.innerHTML = `
                <span><strong>${mat.title}</strong><br><small style="color: var(--text-muted);">${mat.course_code} | By ${mat.uploader_name || "Student"}</small></span>
                <div style="display: flex; gap: 6px;">
                    <button class="approve-res-btn" data-id="${mat.id}" style="padding: 6px 10px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Approve</button>
                    <button class="reject-res-btn" data-id="${mat.id}" style="padding: 6px 10px; background: #c62828; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Reject</button>
                </div>
            `;

        item.querySelector(".approve-res-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          try {
            await api.put(`/resources/${id}/approve`, {}, token);
            loadPendingApprovals();
          } catch (err) {
            alert("Approval failed");
          }
        };

        item.querySelector(".reject-res-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Are you sure you want to reject this resource?")) {
            try {
              const headers = { Authorization: "Bearer " + token };
              await fetch(`http://localhost:5000/api/resources/${id}/reject`, {
                method: "DELETE",
                headers,
              });
              loadPendingApprovals();
            } catch (err) {
              alert("Rejection failed");
            }
          }
        };

        pContainer.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPendingEventApprovals() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/events", token);
      const eContainer = document.getElementById("pendingEventsList");
      if (!eContainer) return;
      eContainer.innerHTML = "";

      if (!res.pendingEvents || res.pendingEvents.length === 0) {
        eContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No pending event approvals.</p>`;
        return;
      }

      res.pendingEvents.forEach((ev) => {
        const item = document.createElement("div");
        item.style.cssText =
          "display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid var(--border-color);";
        item.innerHTML = `
                    <span><strong>${ev.title}</strong><br><small style="color: var(--text-muted);">Suggested by student</small></span>
                    <div style="display: flex; gap: 6px;">
                        <button class="approve-event-btn" data-id="${ev.id}" style="padding: 6px 10px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Approve</button>
                        <button class="reject-event-btn" data-id="${ev.id}" style="padding: 6px 10px; background: #c62828; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Reject</button>
                    </div>
                `;

        item.querySelector(".approve-event-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          try {
            await api.put(`/events/${id}/approve`, {}, token);
            loadPendingEventApprovals();
          } catch (err) {
            alert("Approval failed");
          }
        };

        item.querySelector(".reject-event-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Are you sure you want to reject this event?")) {
            try {
              const headers = { Authorization: "Bearer " + token };
              await fetch(`http://localhost:5000/api/events/${id}/reject`, {
                method: "DELETE",
                headers,
              });
              loadPendingEventApprovals();
            } catch (err) {
              alert("Rejection failed");
            }
          }
        };

        eContainer.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPendingTaskApprovals() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/tasks/pending", token);
      const tContainer = document.getElementById("pendingTasksList");
      if (!tContainer) return;
      tContainer.innerHTML = "";

      if (!res.pendingTasks || res.pendingTasks.length === 0) {
        tContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No pending task submissions.</p>`;
        return;
      }

      res.pendingTasks.forEach((task) => {
        const item = document.createElement("div");
        item.style.cssText =
          "display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid var(--border-color);";
        item.innerHTML = `
                    <span><strong>${task.title}</strong> (${task.course_code})<br><small style="color: var(--text-muted);">By ${task.uploader_name || "Student"} | Due: ${new Date(task.due_date).toLocaleDateString()}</small></span>
                    <div style="display: flex; gap: 6px;">
                        <button class="approve-task-btn" data-id="${task.id}" style="padding: 6px 10px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Approve</button>
                        <button class="reject-task-btn" data-id="${task.id}" style="padding: 6px 10px; background: #c62828; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Reject</button>
                    </div>
                `;

        item.querySelector(".approve-task-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          try {
            await api.put(`/tasks/${id}/approve`, {}, token);
            loadPendingTaskApprovals();
          } catch (err) {
            alert("Approval failed");
          }
        };

        item.querySelector(".reject-task-btn").onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Are you sure you want to reject this task?")) {
            try {
              const headers = { Authorization: "Bearer " + token };
              await fetch(`http://localhost:5000/api/tasks/${id}/reject`, {
                method: "DELETE",
                headers,
              });
              loadPendingTaskApprovals();
            } catch (err) {
              alert("Rejection failed");
            }
          }
        };

        tContainer.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  setTimeout(() => {
    loadPendingApprovals();
    loadPendingEventApprovals();
    loadPendingTaskApprovals();

    document
      .getElementById("addRoutineForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          batch: document.getElementById("rBatch").value.trim(),
          day_of_week: document.getElementById("rDay").value.trim(),
          time_slot: document.getElementById("rTime").value.trim(),
          course_name: document.getElementById("rCourse").value.trim(),
          room_no: document.getElementById("rRoom").value.trim(),
        };
        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/academic/routine", payload, token);
          alert(res.message);
          document.getElementById("addRoutineForm").reset();
          document.getElementById("rBatch").value = user.batch;
        } catch (err) {
          alert(err.message);
        }
      });

    document
      .getElementById("addCourseForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          course_code: document.getElementById("cCode").value.trim(),
          course_title: document.getElementById("cTitle").value.trim(),
          department: document.getElementById("cDept").value.trim(),
          batch: document.getElementById("cBatch").value.trim(),
        };
        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/academic/courses", payload, token);
          alert(res.message);
          document.getElementById("addCourseForm").reset();
          document.getElementById("cBatch").value = user.batch;
        } catch (err) {
          alert(err.message);
        }
      });
  }, 0);

  return container;
}
