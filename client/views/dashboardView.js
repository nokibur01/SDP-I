import { api } from "../assets/js/api.js";

export function DashboardView() {
  const container = document.createElement("div");
  container.className = "dashboard-grid";
  container.style.cssText =
    "padding: 30px; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; width: 100%;";

  const user = JSON.parse(localStorage.getItem("user")) || {
    batch: "3rd Year",
  };

  container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <!-- Batch Routine Widget -->
            <div class="widget" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: var(--primary-color);">Batch Routine (${user.batch})</h3>
                    <span id="todayBadge" style="background: var(--primary-color); color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">Today</span>
                </div>
                <div id="routineContainer" style="display: flex; flex-direction: column; gap: 10px;">
                    <p style="color: var(--text-muted);">Loading routine...</p>
                </div>
            </div>

            <!-- High Priority Deadlines Widget -->
            <div class="widget" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px;">
                <div class="widget-header" style="margin-bottom: 15px;">
                    <h3 style="color: #c62828;">🚨 High Priority Deadlines</h3>
                </div>
                <div id="priorityTasksList" style="display: flex; flex-direction: column; gap: 8px;">
                    <p style="color: var(--text-muted); font-size: 13px;">Loading urgent deadlines...</p>
                </div>
            </div>
        </div>

        <div class="widget" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; height: fit-content;">
            <div class="widget-header" style="margin-bottom: 15px;">
                <h3 style="color: var(--primary-color);">Semester Courses</h3>
            </div>
            <div id="coursesContainer" style="display: flex; flex-direction: column; gap: 8px;">
                <p style="color: var(--text-muted);">Loading courses...</p>
            </div>
        </div>
    `;

  async function loadData() {
    try {
      const token = localStorage.getItem("token");

      // Load academic data (routine & courses)
      const academicRes = await api.get("/academic", token);
      if (academicRes.success) {
        renderRoutine(academicRes.routine);
        renderCourses(academicRes.courses);
      }

      // Load tasks data for high priority widget
      const tasksRes = await api.get("/tasks", token);
      renderHighPriorityTasks(tasksRes.tasks);
    } catch (err) {
      document.getElementById("routineContainer").innerHTML =
        `<p style="color: #c62828;">Failed to load routine.</p>`;
      document.getElementById("coursesContainer").innerHTML =
        `<p style="color: #c62828;">Failed to load courses.</p>`;
      document.getElementById("priorityTasksList").innerHTML =
        `<p style="color: #c62828;">Failed to load urgent deadlines.</p>`;
    }
  }

  function renderRoutine(routineList) {
    const rContainer = document.getElementById("routineContainer");
    rContainer.innerHTML = "";
    if (!routineList || routineList.length === 0) {
      rContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No routine scheduled for your batch yet.</p>`;
      return;
    }
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayName = daysOfWeek[new Date().getDay()];
    document.getElementById("todayBadge").textContent = `Today: ${todayName}`;

    routineList.forEach((item) => {
      const isToday =
        item.day_of_week.toLowerCase() === todayName.toLowerCase();
      const row = document.createElement("div");
      row.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 6px; background: ${isToday ? "rgba(0,64,128,0.1)" : "var(--card-bg)"}; border: 1px solid ${isToday ? "var(--primary-color)" : "var(--border-color)"};`;
      row.innerHTML = `
                <div>
                    <strong style="color: var(--primary-color);">${item.day_of_week}</strong> • <span style="font-size: 13px; color: var(--text-muted);">${item.time_slot}</span>
                </div>
                <div style="font-weight: 500; font-size: 14px;">
                    ${item.course_name} <span style="font-size: 12px; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">Room: ${item.room_no}</span>
                </div>
            `;
      rContainer.appendChild(row);
    });
  }

  function renderCourses(coursesList) {
    const cContainer = document.getElementById("coursesContainer");
    cContainer.innerHTML = "";
    if (!coursesList || coursesList.length === 0) {
      cContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No semester courses registered.</p>`;
      return;
    }
    coursesList.forEach((c) => {
      const card = document.createElement("div");
      card.style.cssText =
        "padding: 10px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px;";
      card.innerHTML = `<strong>${c.course_code}</strong>: ${c.course_title}`;
      cContainer.appendChild(card);
    });
  }

  function renderHighPriorityTasks(tasksList) {
    const list = document.getElementById("priorityTasksList");
    list.innerHTML = "";

    const highPriorityTasks = (tasksList || []).filter(
      (t) => t.priority === "High",
    );

    if (highPriorityTasks.length === 0) {
      list.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No high-priority deadlines right now. You're all caught up!</p>`;
      return;
    }

    highPriorityTasks.forEach((task) => {
      let formattedDate = task.due_date;
      try {
        formattedDate = new Date(task.due_date).toLocaleString();
      } catch (e) {}

      const item = document.createElement("div");
      item.style.cssText =
        "background: rgba(198,40,40,0.05); border-left: 4px solid #c62828; padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid var(--border-color);";
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <strong style="color: var(--text-color);">${task.title}</strong>
            <span style="font-size: 10px; background: rgba(198,40,40,0.1); color: #c62828; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${task.course_code}</span>
        </div>
        <p style="color: var(--text-muted); font-size: 12px; margin-top: 3px;">${task.description || "No description provided."}</p>
        <div style="font-size: 11px; color: #c62828; font-weight: bold; margin-top: 5px;">⏰ Due: ${formattedDate}</div>
      `;
      list.appendChild(item);
    });
  }

  setTimeout(() => loadData(), 0);
  return container;
}
