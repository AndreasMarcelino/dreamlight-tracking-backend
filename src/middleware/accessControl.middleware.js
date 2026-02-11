const { Project, ProjectCrew } = require("../models");

/**
 * Middleware to check if user has access to a project
 * Admin: Always has access
 * Producer: Has access if assigned as producer_id
 * Crew: Has access if assigned in ProjectCrew table
 */
exports.checkProjectAccess = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const user = req.user;

    // Admin always has access
    if (user.role === "admin") {
      return next();
    }

    // Get project
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Producer: Check if assigned as producer
    if (user.role === "producer") {
      if (project.producer_id === user.id) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    // Crew: Check if assigned to project
    if (user.role === "crew") {
      const assignment = await ProjectCrew.findOne({
        where: {
          project_id: projectId,
          user_id: user.id,
        },
      });

      if (assignment) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "You are not assigned to this project",
      });
    }

    // Broadcaster and Investor: Check if they are client/investor
    if (user.role === "broadcaster" && project.client_id === user.id) {
      return next();
    }

    if (user.role === "investor" && project.investor_id === user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this project",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if producer has access to manage project
 * Used for: assign tasks, approve submissions, manage episodes
 */
exports.checkProducerAccess = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const user = req.user;

    // Admin always has access
    if (user.role === "admin") {
      return next();
    }

    // Only producer can manage
    if (user.role !== "producer") {
      return res.status(403).json({
        success: false,
        message: "Only producers can perform this action",
      });
    }

    // Check if assigned as producer
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.producer_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if crew is assigned to project
 * Used for: updating task status, viewing assigned tasks
 */
exports.checkCrewAssignment = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const user = req.user;

    // Admin and Producer always have access
    if (user.role === "admin" || user.role === "producer") {
      return next();
    }

    // Crew: must be assigned
    if (user.role !== "crew") {
      return res.status(403).json({
        success: false,
        message: "Only crew members can perform this action",
      });
    }

    const assignment = await ProjectCrew.findOne({
      where: {
        project_id: projectId,
        user_id: user.id,
      },
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this project",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Filter projects based on user role
 * Returns Sequelize where clause for project filtering
 */
exports.getProjectFilterForUser = (user) => {
  // Admin sees all projects
  if (user.role === "admin") {
    return {};
  }

  // Producer sees only their assigned projects
  if (user.role === "producer") {
    return {
      producer_id: user.id,
    };
  }

  // Broadcaster sees their projects as client
  if (user.role === "broadcaster") {
    return {
      client_id: user.id,
    };
  }

  // Investor sees their investments
  if (user.role === "investor") {
    return {
      investor_id: user.id,
    };
  }

  // Crew: handled separately via ProjectCrew junction table
  return null;
};

/**
 * Get available crew for assignment dropdown
 * Admin: All crew members
 * Producer: Only crew assigned to projects they produce
 */
exports.getAvailableCrewForUser = async (user, projectId) => {
  const { User } = require("../models");
  const { Op } = require("sequelize");

  // Admin sees all crew
  if (user.role === "admin") {
    return await User.findAll({
      where: { role: "crew" },
      attributes: ["id", "name", "email"],
      order: [["name", "ASC"]],
    });
  }

  // Producer sees only crew assigned to this project
  if (user.role === "producer" && projectId) {
    const assignedCrewIds = await ProjectCrew.findAll({
      where: { project_id: projectId },
      attributes: ["user_id"],
      raw: true,
    }).then((results) => results.map((r) => r.user_id));

    if (assignedCrewIds.length === 0) {
      return [];
    }

    return await User.findAll({
      where: {
        role: "crew",
        id: { [Op.in]: assignedCrewIds },
      },
      attributes: ["id", "name", "email"],
      order: [["name", "ASC"]],
    });
  }

  return [];
};
