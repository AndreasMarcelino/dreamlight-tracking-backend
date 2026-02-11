const { Finance, Project, Milestone, User, Episode } = require("../models");
const { Op } = require("sequelize");

// @desc    Get all finances with filters
// @route   GET /api/finance
// @access  Private (Admin, Producer)
exports.getFinances = async (req, res, next) => {
  try {
    const { project_id, type, status, month, page = 1, limit = 10 } = req.query;

    const where = {};
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;
    if (status) where.status = status;

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split("-");
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      where.transaction_date = {
        [Op.between]: [startDate, endDate],
      };
    }

    // Producer can only see finances from their projects
    let projectIncludeWhere = {};
    if (req.user.role === "producer") {
      const producerProjects = await Project.findAll({
        where: { producer_id: req.user.id },
        attributes: ["id"],
        raw: true,
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
          summary: { totalExpense: 0, totalIncome: 0 },
        });
      }

      where.project_id = { [Op.in]: projectIds };
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const maxLimit = Math.min(parseInt(limit), 500); // Cap at 500 records

    const { count, rows: finances } = await Finance.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
      ],
      order: [["transaction_date", "DESC"]],
      limit: maxLimit,
      offset: offset,
    });

    // Calculate totals based on filter
    const totalExpense = finances
      .filter((f) => f.type === "Expense")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalIncome = finances
      .filter((f) => f.type === "Income" && f.status === "Received")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    res.status(200).json({
      success: true,
      count: finances.length,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / maxLimit),
      data: finances,
      summary: {
        totalExpense,
        totalIncome,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single finance transaction
// @route   GET /api/finance/:id
// @access  Private
exports.getFinanceById = async (req, res, next) => {
  try {
    const finance = await Finance.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: "project",
        },
      ],
    });

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: "Finance transaction not found",
      });
    }

    // Producer can only view finances from their projects
    if (
      req.user.role === "producer" &&
      finance.project?.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this transaction",
      });
    }

    res.status(200).json({
      success: true,
      data: finance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create finance transaction
// @route   POST /api/finance
// @access  Private (Admin, Producer)
exports.createFinance = async (req, res, next) => {
  try {
    const {
      project_id,
      type,
      category,
      amount,
      transaction_date,
      status,
      description,
    } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Producer can only create finances for their projects
    if (req.user.role === "producer" && project.producer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create transactions for this project",
      });
    }

    const finance = await Finance.create({
      project_id,
      type,
      category,
      amount,
      transaction_date,
      status: status || "Pending",
      description,
    });

    res.status(201).json({
      success: true,
      message: "Transaksi berhasil dicatat!",
      data: finance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update finance transaction
// @route   PUT /api/finance/:id
// @access  Private (Admin, Producer)
exports.updateFinance = async (req, res, next) => {
  try {
    const finance = await Finance.findByPk(req.params.id, {
      include: [{ model: Project, as: "project" }],
    });

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: "Finance transaction not found",
      });
    }

    // Producer can only update finances for their projects
    if (
      req.user.role === "producer" &&
      finance.project?.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this transaction",
      });
    }

    const { type, category, amount, transaction_date, status, description } =
      req.body;

    await finance.update({
      type: type || finance.type,
      category: category || finance.category,
      amount: amount !== undefined ? amount : finance.amount,
      transaction_date: transaction_date || finance.transaction_date,
      status: status || finance.status,
      description:
        description !== undefined ? description : finance.description,
    });

    res.status(200).json({
      success: true,
      message: "Transaksi berhasil diperbarui!",
      data: finance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete finance transaction
// @route   DELETE /api/finance/:id
// @access  Private (Admin, Producer for own projects)
exports.deleteFinance = async (req, res, next) => {
  try {
    const finance = await Finance.findByPk(req.params.id, {
      include: [{ model: Project, as: "project" }],
    });

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: "Finance transaction not found",
      });
    }

    // Producer can only delete finances for their projects
    if (
      req.user.role === "producer" &&
      finance.project?.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this transaction",
      });
    }

    await finance.destroy();

    res.status(200).json({
      success: true,
      message: "Transaksi berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending payroll (unpaid milestones)
// @route   GET /api/finance/payroll/pending
// @access  Private (Admin, Producer)
exports.getPendingPayroll = async (req, res, next) => {
  try {
    const { project_id, page = 1, limit = 10 } = req.query;
    const user = req.user;

    // Cap limit at 100
    const maxLimit = Math.min(parseInt(limit) || 20, 100);
    const offset = (parseInt(page) - 1) * maxLimit;

    const where = {
      payment_status: "Unpaid",
      work_status: "Done",
    };

    // If producer, only show payroll from their projects
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
          data: [],
          totalPending: 0,
          total: 0,
          page: 1,
          totalPages: 0,
        });
      }

      where.project_id = { [Op.in]: projectIds };
    }

    // Filter by specific project if provided
    if (project_id) where.project_id = project_id;

    const { count, rows: pendingPayrolls } = await Milestone.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Episode,
          as: "episode",
          attributes: ["id", "title", "episode_number"],
          required: false,
        },
      ],
      order: [["updated_at", "DESC"]],
      limit: maxLimit,
      offset,
      distinct: true,
    });

    // Calculate total pending for all matching records (not just current page)
    const allPending = await Milestone.findAll({
      where,
      attributes: ["honor_amount"],
    });
    const totalPending = allPending.reduce(
      (sum, p) => sum + parseFloat(p.honor_amount),
      0,
    );

    res.status(200).json({
      success: true,
      count: pendingPayrolls.length,
      data: pendingPayrolls,
      totalPending,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / maxLimit),
    });
  } catch (error) {
    // ✅ FIX: Better error logging
    console.error("Get Pending Payroll Error:", error.message);

    // Return detailed error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to load pending payroll",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// @desc    Pay crew honor
// @route   POST /api/finance/pay-crew
// @access  Private (Admin, Producer)
exports.payCrew = async (req, res, next) => {
  try {
    const { milestone_id } = req.body;

    if (!milestone_id) {
      return res.status(400).json({
        success: false,
        message: "milestone_id is required",
      });
    }

    const milestone = await Milestone.findByPk(milestone_id, {
      include: [
        { model: User, as: "user" },
        { model: Project, as: "project" },
      ],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Producer can only pay crew from their projects
    if (
      req.user.role === "producer" &&
      milestone.project?.producer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to pay crew for this project",
      });
    }

    if (milestone.payment_status === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Honor sudah dibayarkan sebelumnya",
      });
    }

    // Update payment status
    await milestone.update({ payment_status: "Paid" });

    // Optional: Create finance record for crew payment
    await Finance.create({
      project_id: milestone.project_id,
      type: "Expense",
      category: `Honor Crew: ${milestone.user?.name || "Unknown"} - ${milestone.task_name}`,
      amount: milestone.honor_amount,
      transaction_date: new Date(),
      status: "Paid",
      description: `Payment for ${milestone.task_name} in ${milestone.project?.title || "Unknown Project"}`,
    });

    res.status(200).json({
      success: true,
      message: "Honor crew berhasil dibayarkan!",
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get finance summary
// @route   GET /api/finance/summary
// @access  Private
exports.getFinanceSummary = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    let projectIds = [];

    if (project_id) {
      projectIds = [project_id];
    } else if (req.user.role === "producer") {
      // Producer can only see summary from their projects
      const producerProjects = await Project.findAll({
        where: { producer_id: req.user.id },
        attributes: ["id"],
      });
      projectIds = producerProjects.map((p) => p.id);

      if (projectIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            totalIncome: 0,
            totalExpense: 0,
            crewExpense: 0,
            totalExpenseWithCrew: 0,
            pendingAR: 0,
            netProfit: 0,
          },
        });
      }
    } else {
      // Get all active projects (for admin)
      const projects = await Project.findAll({
        where: { global_status: { [Op.ne]: "Finished" } },
        attributes: ["id"],
      });
      projectIds = projects.map((p) => p.id);
    }

    // Get all finances for these projects
    const finances = await Finance.findAll({
      where: { project_id: projectIds },
    });

    const totalExpense = finances
      .filter((f) => f.type === "Expense")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalIncome = finances
      .filter((f) => f.type === "Income" && f.status === "Received")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const pendingAR = finances
      .filter((f) => f.type === "Income" && f.status === "Pending")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    // Get crew expenses from milestones
    const crewExpense =
      (await Milestone.sum("honor_amount", {
        where: {
          project_id: projectIds,
          payment_status: "Paid",
        },
      })) || 0;

    const totalExpenseWithCrew = totalExpense + crewExpense;
    const netProfit = totalIncome - totalExpenseWithCrew;

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        crewExpense,
        totalExpenseWithCrew,
        pendingAR,
        netProfit,
      },
    });
  } catch (error) {
    next(error);
  }
};
