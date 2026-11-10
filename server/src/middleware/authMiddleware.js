import jwt from "jsonwebtoken";
import db from "../config/db.js";

/**
 * Middleware: Verify JWT Authentication
 * Validates the Authorization Bearer header using the configured JWT_SECRET.
 * Rejects missing, invalid, or expired tokens with HTTP 401.
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token is required.",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization header format. Expected 'Bearer <token>'.",
    });
  }

  const token = parts[1];

  if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not defined!");
    return res.status(500).json({
      success: false,
      message: "Server authentication configuration error.",
    });
  }

  let verified;
  try {
    verified = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid authentication token.",
    });
  }

  // Load the account's *current* role/batch so role changes and deletions take effect immediately
  // (the token alone could carry a stale role for up to its full lifetime).
  try {
    const [rows] = await db.execute(
      "SELECT id, email, role, batch, department FROM users WHERE id = ?",
      [verified.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "This account no longer exists. Please log in again.",
      });
    }
    const current = rows[0];
    req.user = {
      ...verified,
      id: current.id,
      email: current.email,
      role: current.role,
      batch: current.batch,
      department: current.department,
    };
    next();
  } catch (err) {
    console.error("Auth lookup error:", err.message);
    return res.status(500).json({ success: false, message: "Unable to verify session." });
  }
};

/**
 * Middleware: Role-Based Authorization
 * Enforces that req.user.role matches one of the permitted roles.
 * Usage: requireRole("admin") or requireRole("cr", "admin")
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role check.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires ${allowedRoles.join(" or ")} role.`,
      });
    }

    next();
  };
};
