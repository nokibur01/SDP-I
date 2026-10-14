import { api } from "../assets/js/api.js";

export function ResourcesView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1000px;";

  const user = JSON.parse(localStorage.getItem("user")) || { role: "student" };

  container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="color: var(--primary-color); font-size: 24px;">Academic Resources & Notes</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Access course materials, lecture notes, assignments, and question banks.</p>
            </div>
            <span style="background: rgba(0,64,128,0.1); color: var(--primary-color); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">Role: ${user.role.toUpperCase()}</span>
        </div>

        <!-- Upload Resource Form -->
        <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 12px;">Upload Study Material ${user.role === "student" ? "(Requires CR Approval)" : ""}</h3>
            <form id="uploadResourceForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <input type="text" id="resTitle" placeholder="Resource Title (e.g., Chapter 3 Lecture Slides)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="resCourse" placeholder="Course Code (e.g., CSE-3201 or 'General')" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <select id="resCategory" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Book">Book / Reference</option>
                    <option value="Question Bank">Question Bank</option>
                    <option value="Other">Other</option>
                </select>
                <input type="url" id="resUrl" placeholder="File Link (Google Drive / GitHub URL)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <button type="submit" style="grid-column: span 2; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Upload Resource</button>
            </form>
        </div>

        <div id="resourcesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
            <p style="color: var(--text-muted);">Loading resources...</p>
        </div>
    `;

  async function fetchResources() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/resources", token);
      renderResources(res.materials);
    } catch (err) {
      document.getElementById("resourcesGrid").innerHTML =
        `<p style="color: #c62828;">Failed to load resources.</p>`;
    }
  }

  function renderResources(materialsList) {
    const grid = document.getElementById("resourcesGrid");
    grid.innerHTML = "";

    if (!materialsList || materialsList.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No resources uploaded yet.</p>`;
      return;
    }

    materialsList.forEach((mat) => {
      const isPending = mat.status === "pending";
      const card = document.createElement("div");
      card.style.cssText = `
                background: var(--card-bg); 
                border: ${isPending ? "2px dashed #f57c00" : "1px solid var(--border-color)"}; 
                border-radius: 10px; 
                padding: 20px; 
                display: flex; 
                flex-direction: column; 
                gap: 10px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            `;

      card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="font-size: 16px; color: var(--text-color);">${mat.title}</h4>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${isPending ? '<span style="font-size: 10px; background: rgba(245,124,0,0.15); color: #f57c00; border: 1px solid #f57c00; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⏳ Pending</span>' : ""}
                        <span style="font-size: 11px; background: rgba(0,64,128,0.1); color: var(--primary-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-weight: bold;">${mat.course_code}</span>
                    </div>
                </div>
                <p style="font-size: 12px; color: var(--text-muted);">Category: <strong>${mat.category}</strong></p>
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px; margin-top: 5px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <small style="color: var(--text-muted);">Uploaded by: ${mat.uploader_name || "Student"}</small>
                    <a href="${mat.file_url}" target="_blank" style="margin-top: 6px; padding: 8px; background: var(--primary-color); color: white; text-align: center; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">📥 Download / Open Link</a>
                </div>
            `;
      grid.appendChild(card);
    });
  }

  setTimeout(() => {
    fetchResources();

    document
      .getElementById("uploadResourceForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById("resTitle").value,
          course_code: document.getElementById("resCourse").value,
          category: document.getElementById("resCategory").value,
          file_url: document.getElementById("resUrl").value,
        };

        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/resources", payload, token);
          alert(res.message);
          document.getElementById("uploadResourceForm").reset();
          fetchResources();
        } catch (err) {
          alert(err.message);
        }
      });
  }, 0);

  return container;
}
