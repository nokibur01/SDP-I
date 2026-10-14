import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Register User
export const register = async (req, res) => {
  try {
    const { name, email, password, student_id, batch, department, role } =
      req.body;

    // Check if user already exists
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered!" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into database
    const query = `INSERT INTO users (name, email, password, student_id, batch, department, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await db.execute(query, [
      name,
      email,
      hashedPassword,
      student_id || null,
      batch || null,
      department || null,
      role || "student",
    ]);

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      userId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Login User
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    // CRITICAL: Ensure batch is included in the JWT payload
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, batch: user.batch },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "7d" },
    );

    delete user.password;
    res
      .status(200)
      .json({ success: true, message: "Login successful!", token, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
