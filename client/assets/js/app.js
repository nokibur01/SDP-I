import { Sidebar } from "../../components/Sidebar.js";
import { Topbar } from "../../components/Topbar.js";
import { DashboardView } from "../../views/dashboardView.js";
import { ProfileView } from "../../views/profileView.js";
import { MembersView } from "../../views/membersView.js";
import { CRPanelView } from "../../views/crPanelView.js";
import { EventsView } from "../../views/eventsView.js";
import { LoginView } from "../../views/loginView.js";
import { RegisterView } from "../../views/registerView.js";
import { initTheme, toggleTheme } from "./theme.js";
import { ResourcesView } from "../../views/resourcesView.js";
import { ProjectsView } from '../../views/projectsView.js';
import { TasksView } from '../../views/tasksView.js';




function navigate(viewName) {
  const root = document.getElementById("app");
  root.innerHTML = "";

  const token = localStorage.getItem("token");

  if (!token && viewName !== "login" && viewName !== "register") {
    navigate("login");
    return;
  }

  if (viewName === "login") {
    root.appendChild(LoginView(navigate));
    const tBtn = root.querySelector("#themeToggle");
    if (tBtn) tBtn.onclick = () => toggleTheme();
  } else if (viewName === "register") {
    root.appendChild(RegisterView(navigate));
    const tBtn = root.querySelector("#themeToggle");
    if (tBtn) tBtn.onclick = () => toggleTheme();
  } else {
    const layout = document.createElement("div");
    layout.className = "app-layout";

    layout.appendChild(Sidebar(navigate, viewName));

    const mainArea = document.createElement("div");
    mainArea.className = "main-content-area";
    mainArea.appendChild(Topbar());

    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText =
      "flex-grow: 1; overflow-y: auto; width: 100%;";

    if (viewName === "profile") {
      contentWrapper.appendChild(ProfileView(navigate));
    } else if (viewName === "members") {
      contentWrapper.appendChild(MembersView());
    } else if (viewName === "cr-panel") {
      contentWrapper.appendChild(CRPanelView());
    } else if (viewName === "events") {
      contentWrapper.appendChild(EventsView());
    } else if (viewName === "resources") {
      contentWrapper.appendChild(ResourcesView());
    } else if (viewName === "projects") {
      contentWrapper.appendChild(ProjectsView());
    } else if (viewName === "tasks") {
      contentWrapper.appendChild(TasksView());
    } else {
      contentWrapper.appendChild(DashboardView());
    }

    mainArea.appendChild(contentWrapper);
    layout.appendChild(mainArea);
    root.appendChild(layout);
  }
}

function init() {
  initTheme();
  const token = localStorage.getItem("token");
  navigate(token ? "dashboard" : "login");
}

window.addEventListener("DOMContentLoaded", init);
