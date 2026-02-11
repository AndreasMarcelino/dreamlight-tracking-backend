const { ProjectCrew, User, Project } = require("../models");
const { Op } = require("sequelize");

// @desc    Get all crew assigned to a project
// @route   GET /api/projects/:projectId/crew
// @access  Private (Admin, Producer)
exports.getProjectCrew = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get all assigned crew
    const assignments = await ProjectCrew.findAll({
      where: { project_id: projectId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: User,
          as: "assignedBy",
          attributes: ["id", "name"],
        },
      ],
      order: [["assigned_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available crew for assignment (crew not yet assigned to project)
// @route   GET /api/projects/:projectId/crew/available
// @access  Private (Admin)
exports.getAvailableCrew = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get already assigned crew IDs
    const assignedCrewIds = await ProjectCrew.findAll({
      where: { project_id: projectId },
      attributes: ["user_id"],
      raw: true,
    }).then((results) => results.map((r) => r.user_id));

    // Get all crew members NOT assigned to this project
    const availableCrew = await User.findAll({
      where: {
        role: "crew",
        id: { [Op.notIn]: assignedCrewIds.length > 0 ? assignedCrewIds : [0] },
      },
      attributes: ["id", "name", "email"],
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      count: availableCrew.length,
      data: availableCrew,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign crew to project
// @route   POST /api/projects/:projectId/crew
// @access  Private (Admin only)
exports.assignCrewToProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { user_id, role_in_project } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify user exists and is crew
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "crew") {
      return res.status(400).json({
        success: false,
        message: "Only crew members can be assigned to projects",
      });
    }

    // Check if already assigned
    const existing = await ProjectCrew.findOne({
      where: {
        project_id: projectId,
        user_id: user_id,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${user.name} is already assigned to this project`,
      });
    }

    // Create assignment
    const assignment = await ProjectCrew.create({
      project_id: projectId,
      user_id: user_id,
      role_in_project: role_in_project || null,
      assigned_by: req.user.id,
      assigned_at: new Date(),
    });

    // Get full assignment data with relations
    const fullAssignment = await ProjectCrew.findByPk(assignment.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: User,
          as: "assignedBy",
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: `${user.name} has been assigned to ${project.title}`,
      data: fullAssignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk assign multiple crew to project
// @route   POST /api/projects/:projectId/crew/bulk
// @access  Private (Admin only)
exports.bulkAssignCrew = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { user_ids } = req.body;

    // Validate input
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "user_ids must be a non-empty array",
      });
    }

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get all users
    const users = await User.findAll({
      where: {
        id: { [Op.in]: user_ids },
        role: "crew",
      },
    });

    if (users.length !== user_ids.length) {
      return res.status(400).json({
        success: false,
        message: "Some user IDs are invalid or not crew members",
      });
    }

    // Get already assigned crew
    const existingAssignments = await ProjectCrew.findAll({
      where: {
        project_id: projectId,
        user_id: { [Op.in]: user_ids },
      },
    });

    const existingUserIds = existingAssignments.map((a) => a.user_id);
    const newUserIds = user_ids.filter((id) => !existingUserIds.includes(id));

    // Create new assignments
    const newAssignments = await ProjectCrew.bulkCreate(
      newUserIds.map((userId) => ({
        project_id: projectId,
        user_id: userId,
        assigned_by: req.user.id,
        assigned_at: new Date(),
      })),
    );

    res.status(201).json({
      success: true,
      message: `${newAssignments.length} crew member(s) assigned to ${project.title}`,
      data: {
        assigned: newAssignments.length,
        skipped: existingUserIds.length,
        total: user_ids.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update crew assignment (change role in project)
// @route   PUT /api/projects/:projectId/crew/:userId
// @access  Private (Admin only)
exports.updateCrewAssignment = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role_in_project } = req.body;

    const assignment = await ProjectCrew.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Crew assignment not found",
      });
    }

    await assignment.update({
      role_in_project: role_in_project || null,
    });

    // Get updated data with relations
    const updated = await ProjectCrew.findByPk(assignment.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Crew assignment updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove crew from project
// @route   DELETE /api/projects/:projectId/crew/:userId
// @access  Private (Admin only)
exports.removeCrewFromProject = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const assignment = await ProjectCrew.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Crew assignment not found",
      });
    }

    // Check if crew has active tasks in this project
    const { Milestone } = require("../models");
    const activeTasks = await Milestone.count({
      where: {
        project_id: projectId,
        user_id: userId,
        work_status: {
          [Op.in]: ["Pending", "In Progress", "Waiting Approval"],
        },
      },
    });

    if (activeTasks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove ${assignment.user.name}. They have ${activeTasks} active task(s) in this project. Please complete or reassign tasks first.`,
      });
    }

    await assignment.destroy();

    res.status(200).json({
      success: true,
      message: `${assignment.user.name} has been removed from the project`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get projects assigned to a crew member
// @route   GET /api/crew/:userId/projects
// @access  Private
exports.getCrewProjects = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user exists and is crew
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "crew") {
      return res.status(400).json({
        success: false,
        message: "User is not a crew member",
      });
    }

    // Get all project assignments
    const assignments = await ProjectCrew.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Project,
          as: "project",
          where: {
            global_status: { [Op.ne]: "Completed" },
          },
        },
      ],
      order: [[{ model: Project, as: "project" }, "deadline_date", "ASC"]],
    });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user is assigned to project
// @route   GET /api/projects/:projectId/crew/check/:userId
// @access  Private
exports.checkCrewAssignment = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const assignment = await ProjectCrew.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        isAssigned: !!assignment,
        assignment: assignment || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
