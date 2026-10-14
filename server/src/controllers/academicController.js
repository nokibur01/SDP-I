import db from "../config/db.js";

export const getBatchAcademicData = async (req, res) => {
  try {
    const userBatch = req.user.batch ? req.user.batch.trim().toLowerCase() : "";
    console.log("Fetching academic data for normalized user batch:", userBatch);

    const [courses] = await db.execute(
      "SELECT * FROM semester_courses WHERE LOWER(TRIM(batch)) = ?",
      [userBatch],
    );
    const [routine] = await db.execute(
      'SELECT * FROM routines WHERE LOWER(TRIM(batch)) = ? ORDER BY FIELD(day_of_week, "Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday")',
      [userBatch],
    );

    let pendingMaterials = [];
    try {
      const [materials] = await db.execute(
        'SELECT m.*, u.name as uploader_name FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id WHERE m.status = "pending"',
      );
      pendingMaterials = materials;
    } catch (e) {}

    res.status(200).json({ success: true, courses, routine, pendingMaterials });
  } catch (error) {
    console.error("Academic Data Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addCourse = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }
    const { course_code, course_title, department, batch } = req.body;
    await db.execute(
      "INSERT INTO semester_courses (course_code, course_title, department, batch) VALUES (?, ?, ?, ?)",
      [
        course_code.trim(),
        course_title.trim(),
        department.trim(),
        batch.trim(),
      ],
    );
    res
      .status(201)
      .json({ success: true, message: "Course added successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addRoutine = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }
    const { batch, day_of_week, time_slot, course_name, room_no } = req.body;
    await db.execute(
      "INSERT INTO routines (batch, day_of_week, time_slot, course_name, room_no) VALUES (?, ?, ?, ?, ?)",
      [
        batch.trim(),
        day_of_week.trim(),
        time_slot.trim(),
        course_name.trim(),
        room_no.trim(),
      ],
    );
    res
      .status(201)
      .json({ success: true, message: "Routine slot added successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveMaterial = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }
    const { materialId } = req.params;
    await db.execute('UPDATE materials SET status = "approved" WHERE id = ?', [
      materialId,
    ]);
    res
      .status(200)
      .json({ success: true, message: "Material approved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
