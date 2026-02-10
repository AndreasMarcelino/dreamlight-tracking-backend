const { Milestone, User, Project, Episode } = require('../models');
const { Op } = require('sequelize');

// @desc    Get milestones (with optional filters)
// @route   GET /api/milestones?project_id=:id&user_id=:id&episode_id=:id
// @access  Private
exports.getMilestones = async (req, res, next) => {
  try {
    const { project_id, user_id, episode_id, work_status, payment_status } = req.query;

    const where = {};
    if (project_id) where.project_id = project_id;
    if (user_id) where.user_id = user_id;
    if (episode_id) where.episode_id = episode_id;
    if (work_status) where.work_status = work_status;
    if (payment_status) where.payment_status = payment_status;

    const milestones = await Milestone.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'deadline_date']
        },
        {
          model: Episode,
          as: 'episode',
          attributes: ['id', 'title', 'episode_number'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: milestones.length,
      data: milestones
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
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Project,
          as: 'project'
        },
        {
          model: Episode,
          as: 'episode'
        }
      ]
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new milestone (assign crew)
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
      honor_amount
    } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If episode_id provided, verify it exists and belongs to project
    if (episode_id) {
      const episode = await Episode.findOne({
        where: { id: episode_id, project_id }
      });
      
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: 'Episode not found or does not belong to this project'
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
      work_status: 'Pending',
      payment_status: 'Unpaid'
    });

    // Return milestone with relations
    const createdMilestone = await Milestone.findByPk(milestone.id, {
      include: ['user', 'project', 'episode']
    });

    res.status(201).json({
      success: true,
      message: 'Crew berhasil ditugaskan!',
      data: createdMilestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone
// @route   PUT /api/milestones/:id
// @access  Private (Admin, Producer)
exports.updateMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    const {
      episode_id,
      user_id,
      task_name,
      phase_category,
      honor_amount,
      work_status,
      payment_status
    } = req.body;

    // Verify user if updating
    if (user_id) {
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    // Verify episode if updating
    if (episode_id) {
      const episode = await Episode.findOne({
        where: { id: episode_id, project_id: milestone.project_id }
      });
      
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: 'Episode not found or does not belong to this project'
        });
      }
    }

    await milestone.update({
      episode_id: episode_id !== undefined ? episode_id : milestone.episode_id,
      user_id: user_id || milestone.user_id,
      task_name: task_name || milestone.task_name,
      phase_category: phase_category || milestone.phase_category,
      honor_amount: honor_amount !== undefined ? honor_amount : milestone.honor_amount,
      work_status: work_status || milestone.work_status,
      payment_status: payment_status || milestone.payment_status
    });

    // Return with relations
    const updatedMilestone = await Milestone.findByPk(milestone.id, {
      include: ['user', 'project', 'episode']
    });

    res.status(200).json({
      success: true,
      message: 'Data tugas crew berhasil diperbarui!',
      data: updatedMilestone
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
        message: 'Milestone not found'
      });
    }

    // If user is crew, verify they own this task
    if (req.user.role === 'crew' && milestone.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke tugas ini'
      });
    }

    const { work_status } = req.body;

    if (!work_status) {
      return res.status(400).json({
        success: false,
        message: 'work_status is required'
      });
    }

    const validStatuses = ['Pending', 'In Progress', 'Waiting Approval', 'Done'];
    if (!validStatuses.includes(work_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work_status'
      });
    }

    await milestone.update({ work_status });

    res.status(200).json({
      success: true,
      message: 'Status pekerjaan berhasil diperbarui!',
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete milestone
// @route   DELETE /api/milestones/:id
// @access  Private (Admin, Producer)
exports.deleteMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    await milestone.destroy();

    res.status(200).json({
      success: true,
      message: 'Tugas berhasil dihapus'
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
    const { view } = req.query; // 'active' or 'history'

    let where = {
      user_id: req.user.id
    };

    let include = [
      {
        model: Project,
        as: 'project',
        where: {
          global_status: { [Op.ne]: 'Finished' }
        },
        required: true
      },
      {
        model: Episode,
        as: 'episode',
        required: false
      }
    ];

    let order;

    if (view === 'history') {
      // Show completed tasks
      where.work_status = 'Done';
      order = [['updated_at', 'DESC']];
    } else {
      // Show active tasks (not Done)
      where.work_status = { [Op.in]: ['Pending', 'In Progress', 'Waiting Approval'] };
      order = [[{ model: Project, as: 'project' }, 'deadline_date', 'ASC']];
    }

    const tasks = await Milestone.findAll({
      where,
      include,
      order
    });

    // Calculate stats
    const pendingPayment = await Milestone.sum('honor_amount', {
      where: {
        user_id: req.user.id,
        payment_status: 'Unpaid'
      }
    }) || 0;

    const receivedPayment = await Milestone.sum('honor_amount', {
      where: {
        user_id: req.user.id,
        payment_status: 'Paid'
      }
    }) || 0;

    const activeTaskCount = await Milestone.count({
      where: {
        user_id: req.user.id,
        work_status: { [Op.ne]: 'Done' }
      }
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
      stats: {
        pendingPayment,
        receivedPayment,
        activeTaskCount
      }
    });
  } catch (error) {
    next(error);
  }
};
