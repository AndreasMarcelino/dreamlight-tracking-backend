const { User, Project, Milestone, Finance, Episode } = require("../models");
const { Op } = require("sequelize");

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Total projects
    const totalProjects = await Project.count();

    // Ongoing projects (not completed/finished)
    const ongoingProjects = await Project.count({
      where: {
        global_status: { [Op.notIn]: ["Completed", "Finished"] },
      },
    });

    // Total crew
    const totalCrew = await User.count({
      where: { role: "crew" },
    });

    // Recent projects with milestones for progress calculation
    const recentProjects = await Project.findAll({
      limit: 10,
      include: [
        {
          model: Milestone,
          as: "milestones",
          attributes: ["id", "phase_category", "work_status"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Calculate progress stats for each project
    const projectsWithProgress = await Promise.all(
      recentProjects.map(async (project) => {
        const progressStats = await project.getProgressStats();
        return {
          ...project.toJSON(),
          progress_stats: progressStats,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        ongoingProjects,
        totalCrew,
        recentProjects: projectsWithProgress,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get producer dashboard data
// @route   GET /api/dashboard/producer
// @access  Private (Producer)
exports.getProducerDashboard = async (req, res, next) => {
  try {
    const producerId = req.user.id;

    // Get projects where user is the producer
    const myProjects = await Project.findAll({
      where: {
        producer_id: producerId,
        global_status: { [Op.ne]: "Finished" },
      },
      include: [
        {
          model: Milestone,
          as: "milestones",
        },
        {
          model: Episode,
          as: "episodes",
        },
      ],
      order: [["deadline_date", "ASC"]],
    });

    // Pending approvals (milestones waiting approval in producer's projects)
    const projectIds = myProjects.map((p) => p.id);

    const pendingApprovals = await Milestone.count({
      where: {
        work_status: "Waiting Approval",
        project_id: { [Op.in]: projectIds.length > 0 ? projectIds : [0] },
      },
    });

    // Pending payments in producer's projects
    const pendingPayments =
      (await Milestone.sum("honor_amount", {
        where: {
          payment_status: "Unpaid",
          work_status: "Done",
          project_id: { [Op.in]: projectIds.length > 0 ? projectIds : [0] },
        },
      })) || 0;

    // Total crew assigned to my projects
    const totalAssignedCrew = await require("../models").ProjectCrew.count({
      where: {
        project_id: { [Op.in]: projectIds.length > 0 ? projectIds : [0] },
      },
      distinct: true,
      col: "user_id",
    });

    // Projects with progress
    const projectsWithProgress = await Promise.all(
      myProjects.map(async (project) => {
        const progressStats = await project.getProgressStats();
        return {
          ...project.toJSON(),
          progress_stats: progressStats,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        myProjects: projectsWithProgress,
        totalProjects: myProjects.length,
        pendingApprovals,
        pendingPayments,
        totalAssignedCrew,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned crew for producer's projects
// @route   GET /api/dashboard/producer/crew
// @access  Private (Producer, Admin)
exports.getProducerAssignedCrew = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const producerId = req.user.id;
    const { ProjectCrew, User, Project } = require("../models");

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const offset = (pageNum - 1) * limitNum;

    // Get projects where user is the producer
    let projectWhere = {};
    if (req.user.role === "producer") {
      projectWhere.producer_id = producerId;
    }

    const projects = await Project.findAll({
      where: projectWhere,
      attributes: ["id"],
      raw: true,
    });

    const projectIds = projects.map((p) => p.id);

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

    // Get all crew assignments for these projects with pagination
    const { count, rows: crewAssignments } = await ProjectCrew.findAndCountAll({
      where: {
        project_id: { [Op.in]: projectIds },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      count: crewAssignments.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: crewAssignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get crew dashboard data
// @route   GET /api/dashboard/crew
// @access  Private (Crew)
exports.getCrewDashboard = async (req, res, next) => {
  try {
    const { view } = req.query; // 'active' or 'history'

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
      where.work_status = "Done";
      order = [["updated_at", "DESC"]];
    } else {
      where.work_status = {
        [Op.in]: ["Pending", "In Progress", "Waiting Approval"],
      };
      order = [[{ model: Project, as: "project" }, "deadline_date", "ASC"]];
    }

    const myTasks = await Milestone.findAll({
      where,
      include,
      order,
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
      data: {
        myTasks,
        stats: {
          pendingPayment,
          receivedPayment,
          activeTaskCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get broadcaster dashboard data
// @route   GET /api/dashboard/broadcaster
// @access  Private (Broadcaster)
exports.getBroadcasterDashboard = async (req, res, next) => {
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
          model: Milestone,
          as: "milestones",
        },
      ],
      order: [["updated_at", "DESC"]],
    });

    const dashboardItems = [];

    for (const project of projects) {
      if (project.type === "Series") {
        // Add each episode as separate item
        for (const episode of project.episodes) {
          const progressStats = await episode.getProgressStats();

          dashboardItems.push({
            type: "Episode",
            title: `Eps ${episode.episode_number}: ${episode.title}`,
            subtitle: project.title,
            status: episode.status,
            project_id: project.id,
            episode_id: episode.id,
            progress: progressStats,
            updated_at: episode.updated_at,
          });
        }

        // Handle empty series
        if (project.episodes.length === 0) {
          dashboardItems.push({
            type: "Series (Empty)",
            title: project.title,
            subtitle: "No Episodes Yet",
            status: project.global_status,
            project_id: project.id,
            progress: {
              "Pre-Production": 0,
              Production: 0,
              "Post-Production": 0,
            },
            updated_at: project.updated_at,
          });
        }
      } else {
        // Single project (Movie, TVC, Event)
        const progressStats = await project.getProgressStats();

        dashboardItems.push({
          type: project.type,
          title: project.title,
          subtitle: project.client_name || "Single Project",
          status: project.global_status,
          project_id: project.id,
          progress: progressStats,
          updated_at: project.updated_at,
        });
      }
    }

    // Sort by updated_at descending
    dashboardItems.sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    );

    res.status(200).json({
      success: true,
      count: dashboardItems.length,
      data: dashboardItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get investor dashboard data
// @route   GET /api/dashboard/investor
// @access  Private (Investor)
exports.getInvestorDashboard = async (req, res, next) => {
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

// @desc    Get general dashboard (routes based on role)
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const role = req.user.role;

    switch (role) {
      case "admin":
        return getAdminDashboard(req, res, next);
      case "producer":
        return getProducerDashboard(req, res, next);
      case "crew":
        return getCrewDashboard(req, res, next);
      case "broadcaster":
        return getBroadcasterDashboard(req, res, next);
      case "investor":
        return getInvestorDashboard(req, res, next);
      default:
        return res.status(403).json({
          success: false,
          message: "Invalid user role",
        });
    }
  } catch (error) {
    next(error);
  }
};
