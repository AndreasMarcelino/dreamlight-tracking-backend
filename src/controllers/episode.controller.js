const { Episode, Project, Milestone } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all episodes for a project
// @route   GET /api/episodes?project_id=:projectId
// @access  Private
exports.getEpisodes = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id is required'
      });
    }

    const episodes = await Episode.findAll({
      where: { project_id },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'type']
        },
        {
          model: Milestone,
          as: 'milestones',
          attributes: ['id', 'phase_category', 'work_status']
        }
      ],
      order: [['episode_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: episodes.length,
      data: episodes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single episode
// @route   GET /api/episodes/:id
// @access  Private
exports.getEpisodeById = async (req, res, next) => {
  try {
    const episode = await Episode.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: 'project'
        },
        {
          model: Milestone,
          as: 'milestones',
          include: ['user']
        }
      ]
    });

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    // Get progress stats
    const progressStats = await episode.getProgressStats();

    res.status(200).json({
      success: true,
      data: {
        ...episode.toJSON(),
        progress_stats: progressStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new episode
// @route   POST /api/episodes
// @access  Private (Admin, Producer)
exports.createEpisode = async (req, res, next) => {
  try {
    const {
      project_id,
      title,
      episode_number,
      status,
      synopsis,
      airing_date
    } = req.body;

    // Check if project exists
    const project = await Project.findByPk(project_id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project type is Series
    if (project.type !== 'Series') {
      return res.status(400).json({
        success: false,
        message: 'Episodes can only be created for Series type projects'
      });
    }

    // Check for duplicate episode number
    const existingEpisode = await Episode.findOne({
      where: { project_id, episode_number }
    });

    if (existingEpisode) {
      return res.status(400).json({
        success: false,
        message: 'Episode number already exists for this project'
      });
    }

    const episode = await Episode.create({
      project_id,
      title,
      episode_number,
      status: status || 'Scripting',
      synopsis,
      airing_date
    });

    res.status(201).json({
      success: true,
      message: 'Episode berhasil ditambahkan!',
      data: episode
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update episode
// @route   PUT /api/episodes/:id
// @access  Private (Admin, Producer)
exports.updateEpisode = async (req, res, next) => {
  try {
    const episode = await Episode.findByPk(req.params.id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    const {
      title,
      episode_number,
      status,
      synopsis,
      airing_date
    } = req.body;

    // If updating episode number, check for duplicates
    if (episode_number && episode_number !== episode.episode_number) {
      const existingEpisode = await Episode.findOne({
        where: { 
          project_id: episode.project_id, 
          episode_number,
          id: { [Op.ne]: episode.id }
        }
      });

      if (existingEpisode) {
        return res.status(400).json({
          success: false,
          message: 'Episode number already exists for this project'
        });
      }
    }

    await episode.update({
      title: title || episode.title,
      episode_number: episode_number || episode.episode_number,
      status: status || episode.status,
      synopsis: synopsis !== undefined ? synopsis : episode.synopsis,
      airing_date: airing_date !== undefined ? airing_date : episode.airing_date
    });

    res.status(200).json({
      success: true,
      message: 'Status episode diperbarui!',
      data: episode
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete episode
// @route   DELETE /api/episodes/:id
// @access  Private (Admin, Producer)
exports.deleteEpisode = async (req, res, next) => {
  try {
    const episode = await Episode.findByPk(req.params.id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    await episode.destroy();

    res.status(200).json({
      success: true,
      message: 'Episode dihapus'
    });
  } catch (error) {
    next(error);
  }
};
