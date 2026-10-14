import { api } from "../assets/js/api.js";

export function LoginView(navigate) {
  const container = document.createElement("div");
  container.className = "auth-container";
  container.innerHTML = `
        <button id="themeToggle" class="theme-toggle-btn global-theme-toggle" title="Toggle Theme">🌓</button>
        <div class="auth-card">
            <h2>BatchHub</h2>
            <p class="auth-subtitle">Sign in to access your university batch portal</p>
            <form id="loginForm" class="auth-form">
                <label>Email Address</label>
                <input type="email" id="loginEmail" placeholder="student@university.edu" required>
                
                <label>Password</label>
                <input type="password" id="loginPassword" placeholder="••••••••" required>
                
                <button type="submit">Sign In</button>
            </form>
            <p id="loginMsg" class="form-msg"></p>
            <div class="auth-switch">
                Don't have an account? <a href="#" id="toRegister">Register here</a>
            </div>
        </div>
    `;

  setTimeout(() => {
    document.getElementById("themeToggle").onclick = () => {
      const { toggleTheme } = require("../assets/js/theme.js"); // or imported function
      // Alternatively handled globally in app.js
    };

    document.getElementById("toRegister").onclick = (e) => {
      e.preventDefault();
      navigate("register");
    };

    document
      .getElementById("loginForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          email: document.getElementById("loginEmail").value,
          password: document.getElementById("loginPassword").value,
        };

        const msg = document.getElementById("loginMsg");
        msg.style.color = "var(--text-muted)";
        msg.textContent = "Authenticating...";

        try {
          const res = await api.post("/auth/login", payload);
          msg.style.color = "#2e7d32";
          msg.textContent = res.message;
          localStorage.setItem("token", res.token);
          localStorage.setItem("user", JSON.stringify(res.user));
          setTimeout(() => navigate("dashboard"), 800);
        } catch (err) {
          msg.style.color = "#c62828";
          msg.textContent = err.message;
        }
      });
  }, 0);

  return container;
}
