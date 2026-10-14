import { api } from "../assets/js/api.js";

export function ProfileView(navigate) {
  const container = document.createElement("div");
  container.className = "view-container";
  container.style.cssText =
    "display: flex; justify-content: center; align-items: center; padding: 20px;";

  // Random fallback avatar if none is set
  const randomDefaultAvatar =
    "https://api.dicebear.com/7.x/bottts/svg?seed=BatchHubUser";

  container.innerHTML = `
        <div class="card" style="width: 100%; max-width: 600px; padding: 30px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
                <img id="previewAvatar" src="${randomDefaultAvatar}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); background: #eee;">
                <div>
                    <h2 style="color: var(--primary-color); font-size: 22px; margin-bottom: 4px;">My Profile</h2>
                    <p style="color: var(--text-muted); font-size: 13px;">Upload a profile picture from your computer, update your skills, and manage your academic info.</p>
                </div>
            </div>

            <form id="profileForm" class="auth-form" style="display: flex; flexDirection: column; gap: 14px;">
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 6px;">Upload Profile Picture from Computer</label>
                    <input type="file" id="imageInput" accept="image/*" style="width: 100%; padding: 8px; border: 1px dashed var(--border-color); border-radius: 6px; background: var(--bg-color); cursor: pointer;">
                    <input type="hidden" id="profilePictureBase64">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Full Name</label>
                        <input type="text" id="profName" required style="width: 100%; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Email (Read-only)</label>
                        <input type="email" id="profEmail" disabled style="width: 100%; margin-top: 5px; background: var(--bg-color); cursor: not-allowed; opacity: 0.7;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Student ID</label>
                        <input type="text" id="profStudentId" style="width: 100%; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Batch</label>
                        <input type="text" id="profBatch" style="width: 100%; margin-top: 5px;">
                    </div>
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Department</label>
                    <input type="text" id="profDepartment" style="width: 100%; margin-top: 5px;">
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Skills (Comma separated, e.g., Python, React, MySQL)</label>
                    <input type="text" id="profSkills" placeholder="Python, JavaScript, Git" style="width: 100%; margin-top: 5px;">
                </div>

                <button type="submit" style="padding: 12px; background-color: var(--primary-color); color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px;">Save Changes</button>
            </form>
            <p id="profMsg" class="form-msg" style="margin-top: 15px; text-align: center; font-weight: bold;"></p>
        </div>
    `;

  async function loadProfile() {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/users/profile", token);
      if (res.success) {
        const u = res.user;
        document.getElementById("profName").value = u.name || "";
        document.getElementById("profEmail").value = u.email || "";
        document.getElementById("profStudentId").value = u.student_id || "";
        document.getElementById("profBatch").value = u.batch || "";
        document.getElementById("profDepartment").value = u.department || "";
        document.getElementById("profSkills").value = u.skills || "";

        const savedPicture =
          u.profile_picture && u.profile_picture.trim() !== ""
            ? u.profile_picture
            : randomDefaultAvatar;
        document.getElementById("profilePictureBase64").value =
          u.profile_picture || "";
        document.getElementById("previewAvatar").src = savedPicture;
      }
    } catch (err) {
      const msg = document.getElementById("profMsg");
      msg.style.color = "#c62828";
      msg.textContent = "Failed to load profile data.";
    }
  }

  setTimeout(() => {
    loadProfile();

    // Handle file selection and convert to Base64 preview
    document.getElementById("imageInput").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (uploadEvent) {
          const base64String = uploadEvent.target.result;
          document.getElementById("profilePictureBase64").value = base64String;
          document.getElementById("previewAvatar").src = base64String;
        };
        reader.readAsDataURL(file);
      }
    });

    document
      .getElementById("profileForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const payload = {
          name: document.getElementById("profName").value,
          student_id: document.getElementById("profStudentId").value,
          batch: document.getElementById("profBatch").value,
          department: document.getElementById("profDepartment").value,
          profile_picture: document.getElementById("profilePictureBase64")
            .value,
          skills: document.getElementById("profSkills").value,
        };

        const msg = document.getElementById("profMsg");
        msg.style.color = "var(--text-muted)";
        msg.textContent = "Updating profile...";

        try {
          const res = await api.put("/users/profile", payload, token);
          msg.style.color = "#2e7d32";
          msg.textContent = res.message;
          localStorage.setItem("user", JSON.stringify(res.user));

          setTimeout(() => {
            navigate("profile");
          }, 800);
        } catch (err) {
          msg.style.color = "#c62828";
          msg.textContent = err.message;
        }
      });
  }, 0);

  return container;
}
