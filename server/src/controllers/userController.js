import db from "../config/db.js";

// Get Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.execute(
      "SELECT id, name, email, student_id, batch, department, role, profile_picture, skills, gender, created_at FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      student_id,
      batch,
      department,
      profile_picture,
      skills,
      gender,
    } = req.body;

    const query = `UPDATE users SET name = ?, student_id = ?, batch = ?, department = ?, profile_picture = ?, skills = ?, gender = ? WHERE id = ?`;
    await db.execute(query, [
      name,
      student_id || null,
      batch || null,
      department || null,
      profile_picture || null,
      skills || null,
      gender || null,
      userId,
    ]);

    const [updatedUser] = await db.execute(
      "SELECT id, name, email, student_id, batch, department, role, profile_picture, skills, gender FROM users WHERE id = ?",
      [userId],
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: updatedUser[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
