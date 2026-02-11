const { User, Project, Milestone } = require("../models");
const { Op } = require("sequelize");

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    // Pagination with cap
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Search by name or email
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      order: [["created_at", "DESC"]],
      limit: limitNum,
      offset,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Milestone,
          as: "milestones",
          include: ["project"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { name, email, role } = req.body;

    // Check if email already exists (if changing email)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // Update user
    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
    });

    // Remove password from response
    const updatedUser = user.toJSON();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // Check if user has active tasks
    const activeTasks = await Milestone.count({
      where: {
        user_id: user.id,
        work_status: {
          [Op.in]: ["Pending", "In Progress", "Waiting Approval"],
        },
      },
    });

    if (activeTasks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${activeTasks} active task(s). Please reassign or complete them first.`,
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get task statistics
    const totalTasks = await Milestone.count({
      where: { user_id: user.id },
    });

    const completedTasks = await Milestone.count({
      where: {
        user_id: user.id,
        work_status: "Done",
      },
    });

    const activeTasks = await Milestone.count({
      where: {
        user_id: user.id,
        work_status: {
          [Op.in]: ["Pending", "In Progress", "Waiting Approval"],
        },
      },
    });

    const totalEarned =
      (await Milestone.sum("honor_amount", {
        where: {
          user_id: user.id,
          payment_status: "Paid",
        },
      })) || 0;

    const pendingPayment =
      (await Milestone.sum("honor_amount", {
        where: {
          user_id: user.id,
          payment_status: "Unpaid",
          work_status: "Done",
        },
      })) || 0;

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        activeTasks,
        totalEarned,
        pendingPayment,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
