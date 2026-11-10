import bcrypt from "bcryptjs";
import db from "../config/db.js";

// Get Profile

// ~1.5 MB of base64 (≈1.1 MB image). The client downsizes avatars to 256px, so real uploads are far smaller.
const MAX_AVATAR_CHARS = 1_500_000;
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.execute(
      "SELECT id, name, email, student_id, batch, department, role, profile_picture, skills, gender, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to retrieve profile." });
  }
};

// Update Profile (Strict Partial-Update Semantics with Data Loss Prevention)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch current profile
    const [currentRows] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const current = currentRows[0];

    // 2. Validate & determine values (distinguish omitted fields from explicitly passed values)
    const updates = {};

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
        return res.status(400).json({ success: false, message: "Name cannot be empty." });
      }
      updates.name = req.body.name.trim();
    } else {
      updates.name = current.name;
    }

    if (req.body.student_id !== undefined) {
      const trimmedSid = typeof req.body.student_id === "string" ? req.body.student_id.trim() : "";
      if (trimmedSid !== "" && trimmedSid !== current.student_id) {
        // Check uniqueness across other users
        const [existingSid] = await db.execute(
          "SELECT id FROM users WHERE student_id = ? AND id != ?",
          [trimmedSid, userId]
        );
        if (existingSid.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Student ID is already associated with another account.",
          });
        }
      }
      updates.student_id = trimmedSid || current.student_id;
    } else {
      updates.student_id = current.student_id;
    }

    if (req.body.batch !== undefined) {
      updates.batch = typeof req.body.batch === "string" ? req.body.batch.trim() : current.batch;
    } else {
      updates.batch = current.batch;
    }

    if (req.body.department !== undefined) {
      updates.department = typeof req.body.department === "string" ? req.body.department.trim() : current.department;
    } else {
      updates.department = current.department;
    }

    if (req.body.profile_picture !== undefined) {
      const pic = typeof req.body.profile_picture === "string" ? req.body.profile_picture.trim() : "";
      if (pic) {
        const isImageData = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(pic);
        const isHttpUrl = /^https?:\/\/[^\s"'<>]+$/i.test(pic) && pic.length <= 1000;
        if (!isImageData && !isHttpUrl) {
          return res.status(400).json({ success: false, message: "Profile picture must be a PNG, JPG, WebP or GIF image." });
        }
        if (pic.length > MAX_AVATAR_CHARS) {
          return res.status(413).json({ success: false, message: "Profile picture is too large. Please use a smaller image." });
        }
      }
      updates.profile_picture = pic || null;
    } else {
      updates.profile_picture = current.profile_picture;
    }

    if (req.body.skills !== undefined) {
      updates.skills = req.body.skills !== null ? String(req.body.skills).trim() : null;
    } else {
      updates.skills = current.skills;
    }

    if (req.body.gender !== undefined) {
      updates.gender = req.body.gender || null;
    } else {
      updates.gender = current.gender;
    }

    // 3. Execute update on allowed fields only (never alter role, id, created_at, or password here)
    const query = `
      UPDATE users 
      SET name = ?, student_id = ?, batch = ?, department = ?, profile_picture = ?, skills = ?, gender = ? 
      WHERE id = ?
    `;
    await db.execute(query, [
      updates.name,
      updates.student_id,
      updates.batch,
      updates.department,
      updates.profile_picture,
      updates.skills,
      updates.gender,
      userId,
    ]);

    const [updatedUser] = await db.execute(
      "SELECT id, name, email, student_id, batch, department, role, profile_picture, skills, gender FROM users WHERE id = ?",
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current password and new password are required.",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    const [users] = await db.execute("SELECT id, password FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error("Change Password Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update password." });
  }
};

// Admin Only: Promote or assign privileged roles
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !["student", "cr", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Must be 'student', 'cr', or 'admin'.",
      });
    }

    const [user] = await db.execute("SELECT id, name, email, role FROM users WHERE id = ?", [userId]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);

    res.status(200).json({
      success: true,
      message: `User ${user[0].name} role successfully updated to '${role}'.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update user role." });
  }
};
