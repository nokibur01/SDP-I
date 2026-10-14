import { api } from "../assets/js/api.js";

export function RegisterView(navigate) {
  const container = document.createElement("div");
  container.className = "auth-container";
  container.innerHTML = `
        <button id="themeToggle" class="theme-toggle-btn global-theme-toggle" title="Toggle Theme">🌓</button>
        <div class="auth-card" style="max-width: 480px;">
            <h2>Join BatchHub</h2>
            <p class="auth-subtitle">Create your academic collaboration account</p>
            <form id="registerForm" class="auth-form">
                <label>Full Name</label>
                <input type="text" id="name" placeholder="Mahathir Mohammad" required>
                
                <label>Email Address</label>
                <input type="email" id="email" placeholder="student@university.edu" required>
                
                <label>Password</label>
                <input type="password" id="password" placeholder="••••••••" required>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>Student ID</label>
                        <input required type="text" id="student_id" placeholder="245242...">
                    </div>
                    <div>
                        <label>Batch</label>
                        <input required type="text" id="batch" placeholder="3rd Year / 2024">
                    </div>
                </div>

                <label>Department</label>
                <input type="text" id="department" placeholder="Computer Science & Engineering">

                <label>Role</label>
                <select id="role">
                    <option value="student">Student</option>
                    <option value="cr">Batch Representative (CR)</option>
                    <option value="admin">Administrator</option>
                </select>

                <button type="submit">Create Account</button>
            </form>
            <p id="formMsg" class="form-msg"></p>
            <div class="auth-switch">
                Already have an account? <a href="#" id="toLogin">Sign in</a>
            </div>
        </div>
    `;

  setTimeout(() => {
    document.getElementById("toLogin").onclick = (e) => {
      e.preventDefault();
      navigate("login");
    };

    document
      .getElementById("registerForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
          student_id: document.getElementById("student_id").value,
          batch: document.getElementById("batch").value,
          department: document.getElementById("department").value,
          role: document.getElementById("role").value,
        };

        const msg = document.getElementById("formMsg");
        msg.style.color = "var(--text-muted)";
        msg.textContent = "Registering account...";

        try {
          const res = await api.post("/auth/register", payload);
          msg.style.color = "#2e7d32";
          msg.textContent = res.message || "Registration successful!";
          setTimeout(() => navigate("login"), 1200);
        } catch (err) {
          msg.style.color = "#c62828";
          msg.textContent = err.message;
        }
      });
  }, 0);

  return container;
}
