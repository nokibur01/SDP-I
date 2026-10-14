import db from "../config/db.js";

export const getAllMembers = async (req, res) => {
  try {
    const [members] = await db.execute(
      "SELECT id, name, email, student_id, batch, department, role, skills, profile_picture FROM users",
    );
    res.status(200).json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
