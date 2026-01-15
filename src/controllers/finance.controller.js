const { Finance, Project, Milestone } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all finances with filters
// @route   GET /api/finance
// @access  Private (Admin, Producer)
exports.getFinances = async (req, res, next) => {
  try {
    const { project_id, type, status, month } = req.query;

    const where = {};
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;
    if (status) where.status = status;

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      
      where.transaction_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const finances = await Finance.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        }
      ],
      order: [['transaction_date', 'DESC']]
    });

    // Calculate totals based on filter
    const totalExpense = finances
      .filter(f => f.type === 'Expense')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalIncome = finances
      .filter(f => f.type === 'Income' && f.status === 'Received')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    res.status(200).json({
      success: true,
      count: finances.length,
      data: finances,
      summary: {
        totalExpense,
        totalIncome
      }
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
          as: 'project'
        }
      ]
    });

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: 'Finance transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: finance
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
      description
    } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const finance = await Finance.create({
      project_id,
      type,
      category,
      amount,
      transaction_date,
      status: status || 'Pending',
      description
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil dicatat!',
      data: finance
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
    const finance = await Finance.findByPk(req.params.id);

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: 'Finance transaction not found'
      });
    }

    const {
      type,
      category,
      amount,
      transaction_date,
      status,
      description
    } = req.body;

    await finance.update({
      type: type || finance.type,
      category: category || finance.category,
      amount: amount !== undefined ? amount : finance.amount,
      transaction_date: transaction_date || finance.transaction_date,
      status: status || finance.status,
      description: description !== undefined ? description : finance.description
    });

    res.status(200).json({
      success: true,
      message: 'Transaksi berhasil diperbarui!',
      data: finance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete finance transaction
// @route   DELETE /api/finance/:id
// @access  Private (Admin)
exports.deleteFinance = async (req, res, next) => {
  try {
    const finance = await Finance.findByPk(req.params.id);

    if (!finance) {
      return res.status(404).json({
        success: false,
        message: 'Finance transaction not found'
      });
    }

    await finance.destroy();

    res.status(200).json({
      success: true,
      message: 'Transaksi berhasil dihapus'
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
    const { project_id } = req.query;

    const where = {
      payment_status: 'Unpaid',
      work_status: 'Done'
    };

    if (project_id) where.project_id = project_id;

    const pendingPayrolls = await Milestone.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const totalPending = pendingPayrolls.reduce(
      (sum, p) => sum + parseFloat(p.honor_amount), 
      0
    );

    res.status(200).json({
      success: true,
      count: pendingPayrolls.length,
      data: pendingPayrolls,
      totalPending
    });
  } catch (error) {
    next(error);
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
        message: 'milestone_id is required'
      });
    }

    const milestone = await Milestone.findByPk(milestone_id, {
      include: ['user', 'project']
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    if (milestone.payment_status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Honor sudah dibayarkan sebelumnya'
      });
    }

    // Update payment status
    await milestone.update({ payment_status: 'Paid' });

    // Optional: Create finance record for crew payment
    await Finance.create({
      project_id: milestone.project_id,
      type: 'Expense',
      category: `Honor Crew: ${milestone.user.name} - ${milestone.task_name}`,
      amount: milestone.honor_amount,
      transaction_date: new Date(),
      status: 'Paid',
      description: `Payment for ${milestone.task_name} in ${milestone.project.title}`
    });

    res.status(200).json({
      success: true,
      message: 'Honor crew berhasil dibayarkan!',
      data: milestone
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
    } else {
      // Get all active projects
      const projects = await Project.findAll({
        where: { global_status: { [Op.ne]: 'Finished' } },
        attributes: ['id']
      });
      projectIds = projects.map(p => p.id);
    }

    // Get all finances for these projects
    const finances = await Finance.findAll({
      where: { project_id: projectIds }
    });

    const totalExpense = finances
      .filter(f => f.type === 'Expense')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalIncome = finances
      .filter(f => f.type === 'Income' && f.status === 'Received')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const pendingAR = finances
      .filter(f => f.type === 'Income' && f.status === 'Pending')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    // Get crew expenses from milestones
    const crewExpense = await Milestone.sum('honor_amount', {
      where: {
        project_id: projectIds,
        payment_status: 'Paid'
      }
    }) || 0;

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
        netProfit
      }
    });
  } catch (error) {
    next(error);
  }
};
