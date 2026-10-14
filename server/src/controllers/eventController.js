import db from "../config/db.js";

// Get all events that have not passed their due date
export const getEvents = async (req, res) => {
  try {
    const role = req.user.role;

    // Fetch approved or pending events where the event_date is greater than or equal to current time
    const [events] = await db.execute(
      `SELECT e.*, u.name as organizer_name 
             FROM events e 
             LEFT JOIN users u ON e.created_by = u.id 
             WHERE e.status IN ('approved', 'pending') AND e.event_date >= NOW()
             ORDER BY e.event_date ASC`,
    );

    // Fetch pending events specifically for CR/Admin review panel
    let pendingEvents = [];
    if (role === "cr" || role === "admin") {
      const [pEvents] = await db.execute(
        `SELECT e.*, u.name as organizer_name 
                 FROM events e 
                 LEFT JOIN users u ON e.created_by = u.id 
                 WHERE e.status = 'pending' AND e.event_date >= NOW()
                 ORDER BY e.event_date ASC`,
      );
      pendingEvents = pEvents;
    }

    res.status(200).json({ success: true, events, pendingEvents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, description, event_date, location, department } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    const status = role === "cr" || role === "admin" ? "approved" : "pending";
    const msg =
      status === "approved"
        ? "Event published successfully!"
        : "Event submitted for CR approval!";

    await db.execute(
      "INSERT INTO events (title, description, event_date, location, department, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        title.trim(),
        description.trim(),
        event_date,
        location.trim(),
        department ? department.trim() : "CSE",
        userId,
        status,
      ],
    );

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR / Admin: Approve Event
export const approveEvent = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const { eventId } = req.params;
    await db.execute('UPDATE events SET status = "approved" WHERE id = ?', [
      eventId,
    ]);

    res
      .status(200)
      .json({
        success: true,
        message: "Event approved and published successfully!",
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CR / Admin: Reject Event (Deletes or marks as rejected)
export const rejectEvent = async (req, res) => {
  try {
    if (req.user.role !== "cr" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const { eventId } = req.params;
    // Option A: Delete rejected event entirely
    await db.execute("DELETE FROM events WHERE id = ?", [eventId]);

    res
      .status(200)
      .json({ success: true, message: "Event rejected and removed." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
