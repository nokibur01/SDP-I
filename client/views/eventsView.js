import { api } from "../assets/js/api.js";

export function EventsView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1000px;";

  const user = JSON.parse(localStorage.getItem("user")) || {
    role: "student",
    department: "CSE",
  };
  const isCRorAdmin = user.role === "cr" || user.role === "admin";

  container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="color: var(--primary-color); font-size: 24px;">Department & Campus Events</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Explore upcoming workshops, seminars, and departmental activities.</p>
            </div>
            <span style="background: rgba(0,64,128,0.1); color: var(--primary-color); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">Dept: ${user.department || "CSE"}</span>
        </div>

        <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 12px;">${isCRorAdmin ? "Publish New Event" : "Suggest an Event (Requires CR Approval)"}</h3>
            <form id="addEventForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <input type="text" id="eTitle" placeholder="Event Title (e.g., Coding Contest)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="eLocation" placeholder="Location (e.g., Lab 03 / Auditorium)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="datetime-local" id="eDate" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="eDept" value="${user.department || "CSE"}" placeholder="Department (e.g., CSE)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <textarea id="eDesc" placeholder="Event description..." style="grid-column: span 2; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); height: 80px;"></textarea>
                <button type="submit" style="grid-column: span 2; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">${isCRorAdmin ? "Publish Event" : "Submit for Approval"}</button>
            </form>
        </div>

        <div id="eventsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
            <p style="color: var(--text-muted);">Loading events...</p>
        </div>
    `;

  async function fetchEvents() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/events", token);
      renderEvents(res.events);
    } catch (err) {
      document.getElementById("eventsGrid").innerHTML =
        `<p style="color: #c62828;">Failed to load events.</p>`;
    }
  }

  function renderEvents(eventsList) {
    const grid = document.getElementById("eventsGrid");
    grid.innerHTML = "";

    if (!eventsList || eventsList.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No upcoming events found.</p>`;
      return;
    }

    eventsList.forEach((ev) => {
      let formattedDate = ev.event_date;
      try {
        const dateObj = new Date(ev.event_date);
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

      const isPending = ev.status === "pending";

      const card = document.createElement("div");
      // Apply distinct dashed orange border and subtle tint if pending
      card.style.cssText = `
                background: var(--card-bg); 
                border: ${isPending ? "2px dashed #f57c00" : "1px solid var(--border-color)"}; 
                border-radius: 10px; 
                padding: 20px; 
                display: flex; 
                flex-direction: column; 
                gap: 10px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                position: relative;
            `;

      card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="font-size: 16px; color: var(--text-color);">${ev.title}</h4>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${isPending ? '<span style="font-size: 10px; background: rgba(245,124,0,0.15); color: #f57c00; border: 1px solid #f57c00; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⏳ Pending</span>' : ""}
                        <span style="font-size: 11px; background: rgba(0,64,128,0.1); color: var(--primary-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-weight: bold;">${ev.department || "CSE"}</span>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--text-muted);">${ev.description || "No description provided."}</p>
                <div style="font-size: 12px; color: var(--primary-color); display: flex; flex-direction: column; gap: 4px; margin-top: 5px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <span>📅 <strong>Date:</strong> ${formattedDate}</span>
                    <span>📍 <strong>Location:</strong> ${ev.location}</span>
                    <small style="color: var(--text-muted);">Organized by: ${ev.organizer_name || "Student"}</small>
                </div>
            `;
      grid.appendChild(card);
    });
  }

  setTimeout(() => {
    fetchEvents();

    document
      .getElementById("addEventForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById("eTitle").value,
          description: document.getElementById("eDesc").value,
          event_date: document.getElementById("eDate").value,
          location: document.getElementById("eLocation").value,
          department: document.getElementById("eDept").value,
        };

        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/events", payload, token);
          alert(res.message);
          document.getElementById("addEventForm").reset();
          document.getElementById("eDept").value = user.department || "CSE";
          fetchEvents();
        } catch (err) {
          alert(err.message);
        }
      });
  }, 0);

  return container;
}
