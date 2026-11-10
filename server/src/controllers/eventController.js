import db from "../config/db.js";
import { createNotification, broadcastNotification } from "./notificationController.js";
import { visibleBatchClause, moderationClause, canSeeBatch, canModerateBatch, batchForNewContent } from "../utils/batchScope.js";

// Get all approved active events (Pending events are strictly separated for CR/Admin review)
export const getEvents = async (req, res) => {
  try {
    const role = req.user.role;
    const visible = visibleBatchClause(req.user, "e.batch");
    const moderation = moderationClause(req.user, "e.batch");

    // 1. Fetch approved upcoming events for the user's batch (+ global events)
    const [events] = await db.execute(
      `SELECT e.*, u.name as organizer_name 
       FROM events e 
       LEFT JOIN users u ON e.created_by = u.id 
       WHERE e.status = 'approved' AND e.event_date >= NOW() AND ${visible.sql}
       ORDER BY e.event_date ASC`,
      visible.params
    );

    // 2. Fetch past approved events
    const [pastEvents] = await db.execute(
      `SELECT e.*, u.name as organizer_name 
       FROM events e 
       LEFT JOIN users u ON e.created_by = u.id 
       WHERE e.status = 'approved' AND e.event_date < NOW() AND ${visible.sql}
       ORDER BY e.event_date DESC
       LIMIT 20`,
      visible.params
    );

    // 3. Fetch pending events ONLY if user has 'cr' or 'admin' role
    let pendingEvents = [];
    if (role === "cr" || role === "admin") {
      const [pEvents] = await db.execute(
        `SELECT e.*, u.name as organizer_name 
         FROM events e 
         LEFT JOIN users u ON e.created_by = u.id 
         WHERE e.status = 'pending' AND e.event_date >= NOW() AND ${moderation.sql}
         ORDER BY e.event_date ASC`,
        moderation.params
      );
      pendingEvents = pEvents;
    }

    res.status(200).json({ success: true, events, pastEvents, pendingEvents });
  } catch (error) {
    console.error("Get Events Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to retrieve events." });
  }
};

// Create Event (Students require CR approval, CRs/Admins auto-approved)
export const createEvent = async (req, res) => {
  try {
    const { title, description, event_date, location, department } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Event title is required." });
    }

    if (!event_date) {
      return res.status(400).json({ success: false, message: "Event date and time are required." });
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? description.trim() : "";
    const cleanLocation = location ? location.trim() : "Campus";
    const cleanDept = department ? department.trim() : "CSE";

    // Enforce Approval Workflow: CRs/Admins auto-approve, Students set to pending
    const status = role === "cr" || role === "admin" ? "approved" : "pending";

    const eventBatch = batchForNewContent(req.user, req.body.batch);

    const [result] = await db.execute(
      `INSERT INTO events (title, description, event_date, location, department, batch, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanTitle, cleanDesc, event_date, cleanLocation, cleanDept, eventBatch, status, userId]
    );

    const eventId = result.insertId;

    if (status === "approved") {
      // Notify the event's batch
      await broadcastNotification({
        batch: eventBatch,
        excludeUserId: userId,
        type: "event",
        title: `🗓️ Campus Event: ${cleanTitle}`,
        message: `Scheduled for ${new Date(event_date).toLocaleDateString()} at ${cleanLocation}.`,
        relatedEntityType: "event",
        relatedEntityId: eventId,
      });
    }

    res.status(201).json({
      success: true,
      message:
        status === "approved"
          ? "Event published successfully!"
          : "Event submitted for Class Representative review.",
      eventId,
    });
  } catch (error) {
    console.error("Create Event Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create event." });
  }
};

// CR / Admin: Approve Event
export const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [events] = await db.execute("SELECT id, status, title, created_by, event_date, location, batch FROM events WHERE id = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const event = events[0];
    if (!canModerateBatch(req.user, event.batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's events." });
    }
    if (event.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Event is already ${event.status}. Only pending events can be approved.`,
      });
    }

    await db.execute('UPDATE events SET status = "approved" WHERE id = ?', [eventId]);

    // Cross-Module Notification: notify event organizer
    if (event.created_by) {
      await createNotification({
        userId: event.created_by,
        type: "event",
        title: "🎉 Event Approved!",
        message: `Your suggested event "${event.title}" has been approved and published to the campus calendar!`,
        relatedEntityType: "event",
        relatedEntityId: Number(eventId),
      });
    }

    // Broadcast to the event's batch
    await broadcastNotification({
      batch: event.batch,
      excludeUserId: event.created_by,
      type: "event",
      title: `🗓️ New Event: ${event.title}`,
      message: `Scheduled for ${new Date(event.event_date).toLocaleDateString()} at ${event.location || "Campus"}.`,
      relatedEntityType: "event",
      relatedEntityId: Number(eventId),
    });

    res.status(200).json({
      success: true,
      message: `Event "${event.title}" approved and published successfully!`,
    });
  } catch (error) {
    console.error("Approve Event Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to approve event." });
  }
};

// CR / Admin: Reject Event (Preserves audit trail with status = 'rejected')
export const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [events] = await db.execute("SELECT id, status, title, created_by, batch FROM events WHERE id = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const event = events[0];
    if (!canModerateBatch(req.user, event.batch)) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only moderate your own batch's events." });
    }
    if (event.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Event is already ${event.status}. Only pending events can be rejected.`,
      });
    }

    // Preserve audit trail: set status to 'rejected' instead of destructive deletion
    await db.execute('UPDATE events SET status = "rejected" WHERE id = ?', [eventId]);

    // Cross-Module Notification: notify event organizer
    if (event.created_by) {
      await createNotification({
        userId: event.created_by,
        type: "event",
        title: "Event Proposal Update",
        message: `Your suggested event "${event.title}" was declined by the batch representative.`,
        relatedEntityType: "event",
        relatedEntityId: Number(eventId),
      });
    }

    res.status(200).json({
      success: true,
      message: `Event "${event.title}" rejected and recorded.`,
    });
  } catch (error) {
    console.error("Reject Event Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to reject event." });
  }
};

// Update Event (Creator or CR/Admin)
export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, description, event_date, location, department } = req.body;

    const [events] = await db.execute("SELECT id, created_by, batch FROM events WHERE id = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const isOwner = events[0].created_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, events[0].batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to edit this event.",
      });
    }

    await db.execute(
      `UPDATE events 
       SET title = COALESCE(?, title), 
           description = COALESCE(?, description), 
           event_date = COALESCE(?, event_date), 
           location = COALESCE(?, location), 
           department = COALESCE(?, department) 
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        event_date || null,
        location ? location.trim() : null,
        department ? department.trim() : null,
        eventId,
      ]
    );

    res.status(200).json({ success: true, message: "Event updated successfully!" });
  } catch (error) {
    console.error("Update Event Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update event." });
  }
};

// Delete Event (Creator or CR/Admin)
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [events] = await db.execute("SELECT id, created_by, batch FROM events WHERE id = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const isOwner = events[0].created_by === userId;
    const isStaff = (userRole === "admin" || userRole === "cr") && canModerateBatch(req.user, events[0].batch);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete this event.",
      });
    }

    await db.execute("DELETE FROM events WHERE id = ?", [eventId]);

    res.status(200).json({ success: true, message: "Event deleted successfully!" });
  } catch (error) {
    console.error("Delete Event Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete event." });
  }
};
