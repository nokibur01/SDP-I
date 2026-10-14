import db from "../config/db.js";

// Get all published projects + user's incoming join requests for their projects
export const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const [projects] = await db.execute(
      `SELECT p.*, u.name as publisher_name 
             FROM projects p 
             LEFT JOIN users u ON p.created_by = u.id 
             ORDER BY p.created_at DESC`,
    );

    // Fetch pending join requests for projects owned by the logged-in user
    const [incomingRequests] = await db.execute(
      `SELECT pr.id as request_id, pr.project_id, pr.status, p.title as project_title, u.name as requester_name, u.id as requester_id
             FROM project_requests pr
             JOIN projects p ON pr.project_id = p.id
             JOIN users u ON pr.user_id = u.id
             WHERE p.created_by = ? AND pr.status = 'pending'`,
      [userId],
    );

    res.status(200).json({ success: true, projects, incomingRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Publish Project
export const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      tech_stack,
      repo_url,
      team_members,
      department,
    } = req.body;
    const userId = req.user.id;

    await db.execute(
      "INSERT INTO projects (title, description, tech_stack, repo_url, team_members, department, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        title.trim(),
        description ? description.trim() : "",
        tech_stack.trim(),
        repo_url.trim(),
        team_members.trim(),
        department ? department.trim() : "CSE",
        userId,
      ],
    );

    res
      .status(201)
      .json({ success: true, message: "Project published successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Student: Send Join Request
export const joinProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check if already requested
    const [existing] = await db.execute(
      "SELECT * FROM project_requests WHERE project_id = ? AND user_id = ?",
      [projectId, userId],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You have already sent a join request for this project.",
        });
    }

    await db.execute(
      'INSERT INTO project_requests (project_id, user_id, status) VALUES (?, ?, "pending")',
      [projectId, userId],
    );

    res
      .status(201)
      .json({ success: true, message: "Join request sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Owner: Approve Join Request
export const approveJoinRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        // Get request details (joining requester name and project info)
        const [reqs] = await db.execute(
            `SELECT pr.*, u.name as requester_name, p.id as proj_id, p.team_members 
             FROM project_requests pr 
             JOIN users u ON pr.user_id = u.id 
             JOIN projects p ON pr.project_id = p.id 
             WHERE pr.id = ?`,
            [requestId]
        );

        if (reqs.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const request = reqs[0];

        // 1. Update request status to approved
        await db.execute('UPDATE project_requests SET status = "approved" WHERE id = ?', [requestId]);

        // 2. Automatically append requester to project team members list
        const updatedTeam = request.team_members ? `${request.team_members}, ${request.requester_name}` : request.requester_name;
        await db.execute('UPDATE projects SET team_members = ? WHERE id = ?', [updatedTeam, request.proj_id]);

        res.status(200).json({ success: true, message: "Join request approved and added to team!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Owner: Reject Join Request
export const rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    await db.execute("DELETE FROM project_requests WHERE id = ?", [requestId]);

    res.status(200).json({ success: true, message: "Join request rejected." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
