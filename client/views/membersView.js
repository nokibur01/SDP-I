import { api } from "../assets/js/api.js";

export function MembersView() {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "padding: 30px; display: flex; flex-direction: column; gap: 20px; align-items: flex-start; justify-content: flex-start;";

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    batch: "3rd Year",
  };

  container.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
            <div>
                <h2 style="color: var(--primary-color); font-size: 24px;">Batch Members Directory</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Connect with batchmates, view their skills, and select teammates.</p>
            </div>
            <div>
                <button id="filterToggleBtn" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    Showing: My Batch Only
                </button>
            </div>
        </div>

        <div id="membersGrid" style="width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            <p style="color: var(--text-muted);">Loading members...</p>
        </div>
    `;

  let allMembers = [];
  let showOnlyMyBatch = true;

  async function fetchMembers() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/members", token);
      if (res.success) {
        allMembers = res.members;
        renderMembers();
      }
    } catch (err) {
      document.getElementById("membersGrid").innerHTML =
        `<p style="color: #c62828;">Failed to load members.</p>`;
    }
  }

  function renderMembers() {
    const grid = document.getElementById("membersGrid");
    grid.innerHTML = "";

    // Filter based on toggle state
    const filtered = showOnlyMyBatch
      ? allMembers.filter((m) => m.batch === currentUser.batch)
      : allMembers;

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted);">No members found.</p>`;
      return;
    }

    filtered.forEach((member) => {
      const defaultAvatar =
        "https://api.dicebear.com/7.x/bottts/svg?seed=" + member.name;
      const avatar =
        member.profile_picture && member.profile_picture.trim() !== ""
          ? member.profile_picture
          : defaultAvatar;

      // Format skills into clean badges
      const skillsList = member.skills
        ? member.skills
            .split(",")
            .map(
              (s) =>
                `<span style="background: rgba(0,64,128,0.1); color: var(--primary-color); padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${s.trim()}</span>`,
            )
            .join("")
        : '<span style="color: var(--text-muted); font-size: 12px;">No skills listed</span>';

      const card = document.createElement("div");
      card.style.cssText =
        "background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);";
      card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${avatar}" alt="${member.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); background: #eee;">
                    <div>
                        <h4 style="font-size: 16px; color: var(--text-color); margin-bottom: 2px;">${member.name}</h4>
                        <p style="font-size: 12px; color: var(--text-muted);">${member.department || "CSE"} • Batch: ${member.batch || "N/A"}</p>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">
                    <strong>Student ID:</strong> ${member.student_id || "N/A"}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
                    ${skillsList}
                </div>
                <button class="select-member-btn" data-name="${member.name}" style="margin-top: 10px; padding: 8px; background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color); border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                    Select Teammate
                </button>
            `;

      // Select button interaction
      card.querySelector(".select-member-btn").onclick = (e) => {
        const btn = e.target;
        if (btn.style.background === "var(--primary-color)") {
          btn.style.background = "transparent";
          btn.style.color = "var(--primary-color)";
          btn.textContent = "Select Teammate";
        } else {
          btn.style.background = "var(--primary-color)";
          btn.style.color = "white";
          btn.textContent = "Selected ✓";
        }
      };

      grid.appendChild(card);
    });
  }

  setTimeout(() => {
    fetchMembers();

    document.getElementById("filterToggleBtn").onclick = () => {
      showOnlyMyBatch = !showOnlyMyBatch;
      const btn = document.getElementById("filterToggleBtn");
      btn.textContent = showOnlyMyBatch
        ? "Showing: My Batch Only"
        : "Showing: All Batches";
      renderMembers();
    };
  }, 0);

  return container;
}
