const {
  Project,
  User,
  Episode,
  Milestone,
  Finance,
  Asset,
  ProjectCrew,
} = require("../models");
const { Op } = require("sequelize");
const {
  getProjectFilterForUser,
} = require("../middleware/accessControl.middleware");

// @desc    Get all projects (filtered by role)
// @route   GET /api/projects
// @access  Private
exports.getAllProjects = async (req, res, next) => {
  try {
    const {
      status,
      type,
      client_id,
      investor_id,
      page = 1,
      limit = 10,
    } = req.query;
    const user = req.user;

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    // Build base filter
    const where = {};
    if (status) where.global_status = status;
    if (type) where.type = type;
    if (client_id) where.client_id = client_id;
    if (investor_id) where.investor_id = investor_id;

    // Apply role-based filtering
    const roleFilter = getProjectFilterForUser(user);

    // For crew, we need special handling via ProjectCrew junction table
    if (user.role === "crew") {
      const crewAssignments = await ProjectCrew.findAll({
        where: { user_id: user.id },
        attributes: ["project_id"],
        raw: true,
      });

      const projectIds = crewAssignments.map((a) => a.project_id);

      if (projectIds.length === 0) {
        // Crew has no projects assigned
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      where.id = { [Op.in]: projectIds };
    } else if (roleFilter) {
      Object.assign(where, roleFilter);
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "investor",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "producer",
          attributes: ["id", "name", "email"],
        },
        {
          model: Episode,
          as: "episodes",
          attributes: ["id", "title", "episode_number", "status"],
        },
        {
          model: Milestone,
          as: "milestones",
          attributes: ["id", "phase_category", "work_status"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      count: projects.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: User,
          as: "investor",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: User,
          as: "producer",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Episode,
          as: "episodes",
          order: [["episode_number", "ASC"]],
        },
        {
          model: Milestone,
          as: "milestones",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
            {
              model: Episode,
              as: "episode",
              attributes: ["id", "title", "episode_number"],
            },
          ],
          order: [["id", "DESC"]],
        },
        {
          model: Finance,
          as: "finances",
          order: [["transaction_date", "DESC"]],
        },
        {
          model: Asset,
          as: "assets",
          include: [
            {
              model: User,
              as: "uploader",
              attributes: ["id", "name"],
            },
          ],
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get progress stats
    const progressStats = await project.getProgressStats();

    res.status(200).json({
      success: true,
      data: {
        ...project.toJSON(),
        progress_stats: progressStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin, Producer)
exports.createProject = async (req, res, next) => {
  try {
    const {
      title,
      client_id,
      investor_id,
      producer_id,
      type,
      total_budget_plan,
      target_income,
      start_date,
      deadline_date,
      description,
    } = req.body;

    // Get client name if client_id provided
    let client_name = "Internal Project";
    if (client_id) {
      const client = await User.findByPk(client_id);
      if (client) client_name = client.name;
    }

    // Get investor name if investor_id provided
    let investor_name = "Internal Funding";
    if (investor_id) {
      const investor = await User.findByPk(investor_id);
      if (investor) investor_name = investor.name;
    }

    // Get producer name if producer_id provided
    let producer_name = null;
    if (producer_id) {
      const producer = await User.findByPk(producer_id);
      if (producer && producer.role === "producer") {
        producer_name = producer.name;
      } else if (producer) {
        return res.status(400).json({
          success: false,
          message: "Selected user is not a producer",
        });
      }
    }

    const project = await Project.create({
      title,
      client_id: client_id || null,
      client_name,
      investor_id: investor_id || null,
      investor_name,
      producer_id: producer_id || null,
      producer_name,
      type,
      total_budget_plan,
      target_income,
      start_date,
      deadline_date,
      description,
      global_status: "Draft",
    });

    res.status(201).json({
      success: true,
      message: "Project berhasil dibuat!",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin, Producer)
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const {
      title,
      client_id,
      investor_id,
      producer_id,
      type,
      total_budget_plan,
      target_income,
      start_date,
      deadline_date,
      description,
      global_status,
    } = req.body;

    // Update client name if client_id changed
    let client_name = project.client_name;
    if (client_id !== undefined) {
      if (client_id) {
        const client = await User.findByPk(client_id);
        client_name = client ? client.name : "Internal Project";
      } else {
        client_name = "Internal Project";
      }
    }

    // Update investor name if investor_id changed
    let investor_name = project.investor_name;
    if (investor_id !== undefined) {
      if (investor_id) {
        const investor = await User.findByPk(investor_id);
        investor_name = investor ? investor.name : "Internal Funding";
      } else {
        investor_name = "Internal Funding";
      }
    }

    // Update producer name if producer_id changed
    let producer_name = project.producer_name;
    if (producer_id !== undefined) {
      if (producer_id) {
        const producer = await User.findByPk(producer_id);
        if (producer && producer.role === "producer") {
          producer_name = producer.name;
        } else if (producer) {
          return res.status(400).json({
            success: false,
            message: "Selected user is not a producer",
          });
        }
      } else {
        producer_name = null;
      }
    }

    // Update fields
    await project.update({
      title: title || project.title,
      client_id: client_id !== undefined ? client_id : project.client_id,
      client_name,
      investor_id:
        investor_id !== undefined ? investor_id : project.investor_id,
      investor_name,
      producer_id:
        producer_id !== undefined ? producer_id : project.producer_id,
      producer_name,
      type: type || project.type,
      total_budget_plan: total_budget_plan || project.total_budget_plan,
      target_income: target_income || project.target_income,
      start_date: start_date || project.start_date,
      deadline_date: deadline_date || project.deadline_date,
      description:
        description !== undefined ? description : project.description,
      global_status: global_status || project.global_status,
    });

    res.status(200).json({
      success: true,
      message: "Project berhasil diperbarui!",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await project.destroy();

    res.status(200).json({
      success: true,
      message: "Project berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get projects for broadcaster (client)
// @route   GET /api/projects/broadcaster/my-projects
// @access  Private (Broadcaster)
exports.getBroadcasterProjects = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      where: {
        client_id: req.user.id,
        global_status: { [Op.ne]: "Finished" },
      },
      include: [
        {
          model: Episode,
          as: "episodes",
          order: [["episode_number", "ASC"]],
        },
        {
          model: User,
          as: "producer",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["updated_at", "DESC"]],
    });

    // Build project list with progress stats
    const projectList = [];

    for (const project of projects) {
      const progressStats = await project.getProgressStats();

      projectList.push({
        id: project.id,
        title: project.title,
        type: project.type,
        description: project.description,
        status: project.global_status,
        start_date: project.start_date,
        deadline_date: project.deadline_date,
        producer: project.producer,
        episode_count: project.episodes?.length || 0,
        progress: progressStats,
        updated_at: project.updated_at,
      });
    }

    res.status(200).json({
      success: true,
      count: projectList.length,
      data: projectList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get projects for investor
// @route   GET /api/projects/investor/my-investments
// @access  Private (Investor)
exports.getInvestorProjects = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      where: {
        investor_id: req.user.id,
        global_status: { [Op.ne]: "Finished" },
      },
      include: [
        {
          model: Milestone,
          as: "milestones",
        },
        {
          model: Finance,
          as: "finances",
        },
      ],
    });

    // Calculate statistics
    const totalInvestment = projects.reduce(
      (sum, p) => sum + parseFloat(p.total_budget_plan),
      0,
    );

    const projectIds = projects.map((p) => p.id);

    // Get all finances for these projects
    const allFinances = await Finance.findAll({
      where: { project_id: projectIds },
    });

    const opsExpense = allFinances
      .filter((f) => f.type === "Expense")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    // Get crew expenses from milestones
    const crewExpense =
      (await Milestone.sum("honor_amount", {
        where: {
          project_id: projectIds,
          payment_status: "Paid",
        },
      })) || 0;

    const totalExpenseReal = opsExpense + crewExpense;

    const totalIncomeReal = allFinances
      .filter((f) => f.type === "Income" && f.status === "Received")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalAR = allFinances
      .filter((f) => f.type === "Income" && f.status === "Pending")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    // Calculate ROI
    const netProfit = totalIncomeReal - totalExpenseReal;
    const roiPercentage =
      totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

    // Per-project stats
    const projectStats = await Promise.all(
      projects.map(async (p) => {
        const pFinances = allFinances.filter((f) => f.project_id === p.id);

        const pOpsExpense = pFinances
          .filter((f) => f.type === "Expense")
          .reduce((sum, f) => sum + parseFloat(f.amount), 0);

        const pCrewExpense =
          (await Milestone.sum("honor_amount", {
            where: {
              project_id: p.id,
              payment_status: "Paid",
            },
          })) || 0;

        const pTotalExpense = pOpsExpense + pCrewExpense;

        const totalTasks = await Milestone.count({
          where: { project_id: p.id },
        });
        const doneTasks = await Milestone.count({
          where: { project_id: p.id, work_status: "Done" },
        });
        const progress =
          totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        const burnRate =
          parseFloat(p.total_budget_plan) > 0
            ? Math.round(
                (pTotalExpense / parseFloat(p.total_budget_plan)) * 100,
              )
            : 0;

        return {
          title: p.title,
          budget: parseFloat(p.total_budget_plan),
          expense_real: pTotalExpense,
          burn_rate: burnRate,
          production_progress: progress,
          status: burnRate > progress ? "Overbudget" : "Efficient",
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        totalInvestment,
        totalExpenseReal,
        totalIncomeReal,
        totalAR,
        roiPercentage: parseFloat(roiPercentage.toFixed(2)),
        projectStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
