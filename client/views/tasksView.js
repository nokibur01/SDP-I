import { api } from "../assets/js/api.js";

export function TasksView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1000px;";

  const user = JSON.parse(localStorage.getItem("user")) || {
    department: "CSE",
  };

  container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="color: var(--primary-color); font-size: 24px;">Tasks, Assignments & Deadlines</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Track upcoming assignment submissions, lab tasks, and academic deadlines.</p>
            </div>
            <span style="background: rgba(0,64,128,0.1); color: var(--primary-color); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">Dept: ${user.department || "CSE"}</span>
        </div>

        <!-- Add Task Form -->
        <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 12px;">Add Task or Deadline</h3>
            <form id="addTaskForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <input type="text" id="tTitle" placeholder="Task Title (e.g., OS Assignment 2)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="tCourse" placeholder="Course Code (e.g., CSE-3201 or 'General')" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="datetime-local" id="tDate" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <select id="tPriority" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    <option value="Low">Priority: Low</option>
                    <option value="Medium" selected>Priority: Medium</option>
                    <option value="High">Priority: High 🔴</option>
                </select>
                <textarea id="tDesc" placeholder="Task description and submission guidelines..." style="grid-column: span 2; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); height: 80px;"></textarea>
                <button type="submit" style="grid-column: span 2; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Add Deadline</button>
            </form>
        </div>

        <div id="tasksGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
            <p style="color: var(--text-muted);">Loading tasks...</p>
        </div>
    `;

  async function fetchTasks() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/tasks", token);
      renderTasks(res.tasks);
    } catch (err) {
      document.getElementById("tasksGrid").innerHTML =
        `<p style="color: #c62828;">Failed to load tasks.</p>`;
    }
  }

  function renderTasks(tasksList) {
    const grid = document.getElementById("tasksGrid");
    grid.innerHTML = "";

    if (!tasksList || tasksList.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No active task deadlines. All caught up!</p>`;
      return;
    }

    tasksList.forEach((task) => {
      let formattedDate = task.due_date;
      try {
        const dateObj = new Date(task.due_date);
        if (!isNaN(dateObj)) {
          formattedDate = dateObj.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }
      } catch (e) {}

      const priorityColor =
        task.priority === "High"
          ? "#c62828"
          : task.priority === "Medium"
            ? "#f57c00"
            : "#2e7d32";

      const card = document.createElement("div");
      card.style.cssText =
        "background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);";
      card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="font-size: 16px; color: var(--text-color);">${task.title}</h4>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="font-size: 10px; background: ${priorityColor}15; color: ${priorityColor}; border: 1px solid ${priorityColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${task.priority}</span>
                        <span style="font-size: 11px; background: rgba(0,64,128,0.1); color: var(--primary-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-weight: bold;">${task.course_code}</span>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--text-muted);">${task.description || "No description provided."}</p>
                <div style="font-size: 12px; color: var(--primary-color); display: flex; flex-direction: column; gap: 4px; margin-top: 5px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <span>⏰ <strong>Due:</strong> ${formattedDate}</span>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <small style="color: var(--text-muted);">Posted by: ${task.creator_name || "Admin"}</small>
                        <button class="complete-task-btn" data-id="${task.id}" style="padding: 4px 10px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">✓ Mark Done</button>
                    </div>
                </div>
            `;

      card.querySelector(".complete-task-btn").onclick = async (e) => {
        const taskId = e.target.getAttribute("data-id");
        try {
          const token = localStorage.getItem("token");
          const headers = { Authorization: "Bearer " + token };
          await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
            method: "DELETE",
            headers,
          });
          fetchTasks();
        } catch (err) {
          alert("Failed to update task");
        }
      };

      grid.appendChild(card);
    });
  }

  setTimeout(() => {
    fetchTasks();

    document
      .getElementById("addTaskForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById("tTitle").value,
          course_code: document.getElementById("tCourse").value,
          due_date: document.getElementById("tDate").value,
          priority: document.getElementById("tPriority").value,
          description: document.getElementById("tDesc").value,
          department: user.department || "CSE",
        };

        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/tasks", payload, token);
          alert(res.message);
          document.getElementById("addTaskForm").reset();
          fetchTasks();
        } catch (err) {
          alert(err.message);
        }
      });
  }, 0);

  return container;
}
