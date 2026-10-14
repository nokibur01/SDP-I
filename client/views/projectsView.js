import { api } from "../assets/js/api.js";

export function ProjectsView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1000px;";

  const user = JSON.parse(localStorage.getItem("user")) || {
    id: 1,
    department: "CSE",
  };

  container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="color: var(--primary-color); font-size: 24px;">Batch Projects & Group Work</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Showcase semester projects, repositories, and collaborate with batchmates.</p>
            </div>
            <span style="background: rgba(0,64,128,0.1); color: var(--primary-color); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">Dept: ${user.department || "CSE"}</span>
        </div>

        <!-- Incoming Join Requests Panel (Visible to Project Owners) -->
        <div id="incomingRequestsSection" style="display: none; background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 12px;">Pending Project Join Requests</h3>
            <div id="requestsList" style="display: flex; flex-direction: column; gap: 8px;">
                <p style="color: var(--text-muted); font-size: 13px;">Loading requests...</p>
            </div>
        </div>

        <!-- Add Project Form -->
        <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 12px;">Publish Your Project</h3>
            <form id="addProjectForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <input type="text" id="pTitle" placeholder="Project Title (e.g., PeerShare)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="pTech" placeholder="Tech Stack (e.g., Node.js, MySQL)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="text" id="pMembers" placeholder="Team Members (e.g., Mahathir)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <input type="url" id="pRepo" placeholder="Repository / Demo URL (GitHub Link)" required style="padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);">
                <textarea id="pDesc" placeholder="Project description and key features..." style="grid-column: span 2; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); height: 80px;"></textarea>
                <button type="submit" style="grid-column: span 2; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Publish Project</button>
            </form>
        </div>

        <div id="projectsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
            <p style="color: var(--text-muted);">Loading projects...</p>
        </div>
    `;

  async function fetchProjectsData() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/projects", token);
      renderProjects(res.projects);
      renderIncomingRequests(res.incomingRequests);
    } catch (err) {
      document.getElementById("projectsGrid").innerHTML =
        `<p style="color: #c62828;">Failed to load projects.</p>`;
    }
  }

  function renderIncomingRequests(requests) {
    const section = document.getElementById("incomingRequestsSection");
    const list = document.getElementById("requestsList");
    list.innerHTML = "";

    if (!requests || requests.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    requests.forEach((req) => {
      const item = document.createElement("div");
      item.style.cssText =
        "display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid var(--border-color);";
      item.innerHTML = `
                <span><strong>${req.requester_name}</strong> wants to join <strong>${req.project_title}</strong></span>
                <div style="display: flex; gap: 6px;">
                    <button class="approve-req-btn" data-id="${req.request_id}" style="padding: 6px 10px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Approve</button>
                    <button class="reject-req-btn" data-id="${req.request_id}" style="padding: 6px 10px; background: #c62828; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Reject</button>
                </div>
            `;

      item.querySelector(".approve-req-btn").onclick = async (e) => {
        const id = e.target.getAttribute("data-id");
        try {
          const token = localStorage.getItem("token");
          await api.put(`/projects/requests/${id}/approve`, {}, token);
          fetchProjectsData();
        } catch (err) {
          alert("Approval failed");
        }
      };

      item.querySelector(".reject-req-btn").onclick = async (e) => {
        const id = e.target.getAttribute("data-id");
        try {
          const token = localStorage.getItem("token");
          const headers = { Authorization: "Bearer " + token };
          await fetch(
            `http://localhost:5000/api/projects/requests/${id}/reject`,
            { method: "DELETE", headers },
          );
          fetchProjectsData();
        } catch (err) {
          alert("Rejection failed");
        }
      };

      list.appendChild(item);
    });
  }

  function renderProjects(projectsList) {
    const grid = document.getElementById("projectsGrid");
    grid.innerHTML = "";

    if (!projectsList || projectsList.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No projects published yet.</p>`;
      return;
    }

    projectsList.forEach((proj) => {
      const isOwner = proj.created_by === user.id;
      const card = document.createElement("div");
      card.style.cssText =
        "background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);";
      card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="font-size: 16px; color: var(--text-color);">${proj.title}</h4>
                    <span style="font-size: 11px; background: rgba(0,64,128,0.1); color: var(--primary-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-weight: bold;">${proj.department}</span>
                </div>
                <p style="font-size: 13px; color: var(--text-muted);">${proj.description || "No description provided."}</p>
                <div style="font-size: 12px; color: var(--text-color); display: flex; flex-direction: column; gap: 4px; margin-top: 5px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <span>🛠️ <strong>Tech:</strong> ${proj.tech_stack}</span>
                    <span>👥 <strong>Team:</strong> ${proj.team_members}</span>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <a href="${proj.repo_url}" target="_blank" style="flex: 1; padding: 8px; background: var(--primary-color); color: white; text-align: center; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 12px;">🔗 Repository</a>
                        ${!isOwner ? `<button class="join-proj-btn" data-id="${proj.id}" style="padding: 8px 12px; background: #00796b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">👋 Join Project</button>` : '<span style="font-size: 11px; color: #2e7d32; font-weight: bold; align-self: center;">(Your Project)</span>'}
                    </div>
                </div>
            `;

      if (!isOwner) {
        card.querySelector(".join-proj-btn").onclick = async (e) => {
          const projectId = e.target.getAttribute("data-id");
          try {
            const token = localStorage.getItem("token");
            const res = await api.post(
              `/projects/${projectId}/join`,
              {},
              token,
            );
            alert(res.message);
          } catch (err) {
            alert(err.message || "Failed to send join request");
          }
        };
      }

      grid.appendChild(card);
    });
  }

  setTimeout(() => {
    fetchProjectsData();

    document
      .getElementById("addProjectForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById("pTitle").value,
          description: document.getElementById("pDesc").value,
          tech_stack: document.getElementById("pTech").value,
          repo_url: document.getElementById("pRepo").value,
          team_members: document.getElementById("pMembers").value,
          department: user.department || "CSE",
        };

        try {
          const token = localStorage.getItem("token");
          const res = await api.post("/projects", payload, token);
          alert(res.message);
          document.getElementById("addProjectForm").reset();
          fetchProjectsData();
        } catch (err) {
          alert(err.message);
        }
      });
  }, 0);

  return container;
}
