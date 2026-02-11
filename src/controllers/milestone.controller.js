const { Milestone, User, Project, Episode, ProjectCrew } = require("../models");
const { Op } = require("sequelize");
const {
  getAvailableCrewForUser,
} = require("../middleware/accessControl.middleware");

// @desc    Get milestones (with optional filters)
// @route   GET /api/milestones?project_id=:id&user_id=:id&episode_id=:id
// @access  Private
exports.getMilestones = async (req, res, next) => {
  try {
    const {
      project_id,
      user_id,
      episode_id,
      work_status,
      payment_status,
      page = 1,
      limit = 10,
    } = req.query;

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 200); // Cap at 200
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (project_id) where.project_id = project_id;
    if (user_id) where.user_id = user_id;
    if (episode_id) where.episode_id = episode_id;
    if (work_status) where.work_status = work_status;
    if (payment_status) where.payment_status = payment_status;

    const { count, rows: milestones } = await Milestone.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title", "deadline_date"],
        },
        {
          model: Episode,
          as: "episode",
          attributes: ["id", "title", "episode_number"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      count: milestones.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: milestones,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single milestone
// @route   GET /api/milestones/:id
// @access  Private
exports.getMilestoneById = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Project,
          as: "project",
        },
        {
          model: Episode,
          as: "episode",
        },
      ],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new milestone (assign crew) - WITH ACCESS CONTROL
// @route   POST /api/milestones
// @access  Private (Admin, Producer)
exports.createMilestone = async (req, res, next) => {
  try {
    const {
      project_id,
      episode_id,
      user_id,
      task_name,
      phase_category,
      honor_amount,
    } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user can assign tasks to this project
    // Admin: always can
    // Producer: only if assigned as producer
    if (req.user.role === "producer" && project.producer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify crew is assigned to project
    const crewAssignment = await ProjectCrew.findOne({
      where: {
        project_id: project_id,
        user_id: user_id,
      },
    });

    if (!crewAssignment) {
      return res.status(400).json({
        success: false,
        message: `${user.name} is not assigned to this project. Please assign them first in the Crew Assignment tab.`,
      });
    }

    // If episode_id provided, verify it exists and belongs to project
    if (episode_id) {
      const episode = await Episode.findOne({
        where: { id: episode_id, project_id },
      });

      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found or does not belong to this project",
        });
      }
    }

    const milestone = await Milestone.create({
      project_id,
      episode_id: episode_id || null,
      user_id,
      task_name,
      phase_category,
      honor_amount,
      work_status: "Pending",
      payment_status: "Unpaid",
    });

    // Return milestone with relations
    const createdMilestone = await Milestone.findByPk(milestone.id, {
      include: ["user", "project", "episode"],
    });

    res.status(201).json({
      success: true,
      message: "Crew berhasil ditugaskan!",
      data: createdMilestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone - WITH ACCESS CONTROL
// @route   PUT /api/milestones/:id
// @access  Private (Admin, Producer)
exports.updateMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: ["project"],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Check if user can update this milestone
    // Admin: always can
    // Producer: only if assigned as producer
    if (
      req.user.role === "producer" &&
      milestone.project.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    const {
      episode_id,
      user_id,
      task_name,
      phase_category,
      honor_amount,
      work_status,
      payment_status,
    } = req.body;

    // Verify user if updating
    if (user_id) {
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify crew is assigned to project
      const crewAssignment = await ProjectCrew.findOne({
        where: {
          project_id: milestone.project_id,
          user_id: user_id,
        },
      });

      if (!crewAssignment) {
        return res.status(400).json({
          success: false,
          message: `${user.name} is not assigned to this project`,
        });
      }
    }

    // Verify episode if updating
    if (episode_id) {
      const episode = await Episode.findOne({
        where: { id: episode_id, project_id: milestone.project_id },
      });

      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found or does not belong to this project",
        });
      }
    }

    await milestone.update({
      episode_id: episode_id !== undefined ? episode_id : milestone.episode_id,
      user_id: user_id || milestone.user_id,
      task_name: task_name || milestone.task_name,
      phase_category: phase_category || milestone.phase_category,
      honor_amount:
        honor_amount !== undefined ? honor_amount : milestone.honor_amount,
      work_status: work_status || milestone.work_status,
      payment_status: payment_status || milestone.payment_status,
    });

    // Return with relations
    const updatedMilestone = await Milestone.findByPk(milestone.id, {
      include: ["user", "project", "episode"],
    });

    res.status(200).json({
      success: true,
      message: "Data tugas crew berhasil diperbarui!",
      data: updatedMilestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone status (for crew to update their own tasks)
// @route   PATCH /api/milestones/:id/status
// @access  Private (Crew can update own tasks)
exports.updateMilestoneStatus = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // If user is crew, verify they own this task
    if (req.user.role === "crew" && milestone.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke tugas ini",
      });
    }

    const { work_status } = req.body;

    if (!work_status) {
      return res.status(400).json({
        success: false,
        message: "work_status is required",
      });
    }

    const validStatuses = [
      "Pending",
      "In Progress",
      "Waiting Approval",
      "Done",
    ];
    if (!validStatuses.includes(work_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work_status",
      });
    }

    await milestone.update({ work_status });

    res.status(200).json({
      success: true,
      message: "Status pekerjaan berhasil diperbarui!",
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve task submission (Producer only) - NEW FEATURE
// @route   PATCH /api/milestones/:id/approve
// @access  Private (Admin, Producer)
exports.approveTaskSubmission = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: ["project", "user"],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Check if user can approve
    // Admin: always can
    // Producer: only if assigned as producer
    if (
      req.user.role === "producer" &&
      milestone.project.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    // Check if task is in "Waiting Approval" status
    if (milestone.work_status !== "Waiting Approval") {
      return res.status(400).json({
        success: false,
        message: 'Task must be in "Waiting Approval" status to be approved',
      });
    }

    // Approve task
    await milestone.update({
      work_status: "Done",
    });

    res.status(200).json({
      success: true,
      message: `Task approved! ${milestone.user.name}'s work is marked as Done.`,
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject task submission (Producer only) - NEW FEATURE
// @route   PATCH /api/milestones/:id/reject
// @access  Private (Admin, Producer)
exports.rejectTaskSubmission = async (req, res, next) => {
  try {
    const { rejection_note } = req.body;

    const milestone = await Milestone.findByPk(req.params.id, {
      include: ["project", "user"],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Check if user can reject
    // Admin: always can
    // Producer: only if assigned as producer
    if (
      req.user.role === "producer" &&
      milestone.project.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    // Check if task is in "Waiting Approval" status
    if (milestone.work_status !== "Waiting Approval") {
      return res.status(400).json({
        success: false,
        message: 'Task must be in "Waiting Approval" status to be rejected',
      });
    }

    // Reject task - send back to "In Progress"
    await milestone.update({
      work_status: "In Progress",
    });

    res.status(200).json({
      success: true,
      message: `Task rejected. ${milestone.user.name} needs to revise their work.`,
      data: milestone,
      rejection_note: rejection_note || "No note provided",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete milestone - WITH ACCESS CONTROL
// @route   DELETE /api/milestones/:id
// @access  Private (Admin, Producer)
exports.deleteMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: ["project"],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Check if user can delete
    // Admin: always can
    // Producer: only if assigned as producer
    if (
      req.user.role === "producer" &&
      milestone.project.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned as producer for this project",
      });
    }

    await milestone.destroy();

    res.status(200).json({
      success: true,
      message: "Tugas berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get crew dashboard tasks
// @route   GET /api/milestones/crew/my-tasks
// @access  Private (Crew)
exports.getCrewTasks = async (req, res, next) => {
  try {
    const { view, page = 1, limit = 10 } = req.query;

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 50); // Cap at 50
    const offset = (pageNum - 1) * limitNum;

    let where = {
      user_id: req.user.id,
    };

    let include = [
      {
        model: Project,
        as: "project",
        where: {
          global_status: { [Op.ne]: "Finished" },
        },
        required: true,
      },
      {
        model: Episode,
        as: "episode",
        required: false,
      },
    ];

    let order;

    if (view === "history") {
      // Show completed tasks
      where.work_status = "Done";
      order = [["updated_at", "DESC"]];
    } else {
      // Show active tasks (not Done)
      where.work_status = {
        [Op.in]: ["Pending", "In Progress", "Waiting Approval"],
      };
      order = [[{ model: Project, as: "project" }, "deadline_date", "ASC"]];
    }

    const { count, rows: tasks } = await Milestone.findAndCountAll({
      where,
      include,
      order,
      limit: limitNum,
      offset,
      distinct: true,
    });

    // Calculate stats
    const pendingPayment =
      (await Milestone.sum("honor_amount", {
        where: {
          user_id: req.user.id,
          payment_status: "Unpaid",
        },
      })) || 0;

    const receivedPayment =
      (await Milestone.sum("honor_amount", {
        where: {
          user_id: req.user.id,
          payment_status: "Paid",
        },
      })) || 0;

    const activeTaskCount = await Milestone.count({
      where: {
        user_id: req.user.id,
        work_status: { [Op.ne]: "Done" },
      },
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: tasks,
      stats: {
        pendingPayment,
        receivedPayment,
        activeTaskCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending approvals (for producer dashboard) - NEW FEATURE
// @route   GET /api/milestones/pending-approvals
// @access  Private (Admin, Producer)
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const { project_id, page = 1, limit = 10 } = req.query;
    const user = req.user;

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 50);
    const offset = (pageNum - 1) * limitNum;

    const where = {
      work_status: "Waiting Approval",
    };

    // If producer, only show tasks from their projects
    if (user.role === "producer") {
      const producerProjects = await Project.findAll({
        where: { producer_id: user.id },
        attributes: ["id"],
      });

      const projectIds = producerProjects.map((p) => p.id);

      if (projectIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          page: 1,
          totalPages: 0,
          data: [],
        });
      }

      where.project_id = { [Op.in]: projectIds };
    }

    // Filter by specific project if provided
    if (project_id) {
      where.project_id = project_id;
    }

    const { count, rows: pendingTasks } = await Milestone.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
        {
          model: Episode,
          as: "episode",
          attributes: ["id", "title", "episode_number"],
          required: false,
        },
      ],
      order: [["updated_at", "ASC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      count: pendingTasks.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: pendingTasks,
    });
  } catch (error) {
    next(error);
  }
};
