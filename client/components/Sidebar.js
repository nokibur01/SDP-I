export function Sidebar(navigate, currentView) {
  const aside = document.createElement("aside");
  aside.className = "sidebar";

  const user = JSON.parse(localStorage.getItem("user")) || { role: "student" };
  const isCRorAdmin = user.role === "cr" || user.role === "admin";

  aside.innerHTML = `
        <div class="sidebar-top">
            <div class="logo-area">
                <h2>BatchHub</h2>
            </div>
            <div class="nav-menu">
                <a href="#" class="nav-link ${currentView === "dashboard" ? "active" : ""}" data-view="dashboard">Dashboard</a>
                <a href="#" class="nav-link ${currentView === "resources" ? "active" : ""}" data-view="resources">Resources</a>
                <a href="#" class="nav-link ${currentView === "members" ? "active" : ""}" data-view="members">Members</a>
                <a href="#" class="nav-link ${currentView === "events" ? "active" : ""}" data-view="events">Events</a>
                <a href="#" class="nav-link ${currentView === "projects" ? "active" : ""}" data-view="projects">Projects & Groups</a>
                <a href="#" class="nav-link ${currentView === "tasks" ? "active" : ""}" data-view="tasks">Tasks & Deadlines</a>
                ${isCRorAdmin ? `<a href="#" class="nav-link ${currentView === "cr-panel" ? "active" : ""}" data-view="cr-panel" style="color: #2e7d32; font-weight: bold; margin-top: 10px; border: 1px dashed #2e7d32; border-radius: 6px;">⚙️ CR Panel</a>` : ""}
            </div>
        </div>
        <div class="sidebar-footer">
            <a href="#" class="nav-link ${currentView === "profile" ? "active" : ""}" data-view="profile">Profile</a>
            <a href="#" class="nav-link ${currentView === "settings" ? "active" : ""}" data-view="settings">Settings</a>
            <a href="#" class="nav-link ${currentView === "help" ? "active" : ""}" data-view="help">Help & Support</a>
            <button id="logoutBtn" class="logout-btn">Logout</button>
        </div>
    `;

  setTimeout(() => {
    aside.querySelectorAll("[data-view]").forEach((link) => {
      link.onclick = (e) => {
        e.preventDefault();
        navigate(link.getAttribute("data-view"));
      };
    });

    aside.querySelector("#logoutBtn").onclick = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("login");
    };
  }, 0);

  return aside;
}
