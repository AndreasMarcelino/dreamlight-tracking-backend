const { Asset, Project, Episode, User } = require('../models');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get assets with filters
// @route   GET /api/assets
// @access  Private
exports.getAssets = async (req, res, next) => {
  try {
    const { project_id, episode_id, category, is_public_to_broadcaster } = req.query;

    const where = {};
    if (project_id) where.project_id = project_id;
    if (episode_id) where.episode_id = episode_id;
    if (category) where.category = category;
    if (is_public_to_broadcaster !== undefined) {
      where.is_public_to_broadcaster = is_public_to_broadcaster === 'true';
    }

    // If user is broadcaster, only show public assets
    if (req.user.role === 'broadcaster') {
      where.is_public_to_broadcaster = true;
      
      // Also filter by client_id
      const projects = await Project.findAll({
        where: { client_id: req.user.id },
        attributes: ['id']
      });
      const projectIds = projects.map(p => p.id);
      where.project_id = projectIds;
    }

    const assets = await Asset.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        },
        {
          model: Episode,
          as: 'episode',
          attributes: ['id', 'title', 'episode_number'],
          required: false
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Private
exports.getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: ['project', 'episode', 'uploader']
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check access for broadcaster
    if (req.user.role === 'broadcaster') {
      const project = await Project.findByPk(asset.project_id);
      
      if (project.client_id !== req.user.id || !asset.is_public_to_broadcaster) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this file'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload asset
// @route   POST /api/assets
// @access  Private (Admin, Producer)
exports.uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const {
      project_id,
      episode_id,
      category,
      is_public_to_broadcaster
    } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      // Delete uploaded file if project not found
      await fs.unlink(req.file.path);
      
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify episode if provided
    if (episode_id) {
      const episode = await Episode.findOne({
        where: { id: episode_id, project_id }
      });
      
      if (!episode) {
        await fs.unlink(req.file.path);
        
        return res.status(404).json({
          success: false,
          message: 'Episode not found or does not belong to this project'
        });
      }
    }

    const asset = await Asset.create({
      project_id,
      episode_id: episode_id || null,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      category,
      is_public_to_broadcaster: is_public_to_broadcaster === 'true' || is_public_to_broadcaster === true,
      uploaded_by: req.user.id
    });

    // Return asset with relations
    const uploadedAsset = await Asset.findByPk(asset.id, {
      include: ['project', 'episode', 'uploader']
    });

    res.status(201).json({
      success: true,
      message: 'File berhasil diupload!',
      data: uploadedAsset
    });
  } catch (error) {
    // If error occurs, delete the uploaded file
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error(err));
    }
    next(error);
  }
};

// @desc    Update asset metadata
// @route   PUT /api/assets/:id
// @access  Private (Admin, Producer, Uploader)
exports.updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check if user is uploader or has admin/producer role
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'producer' && 
      asset.uploaded_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this asset'
      });
    }

    const { category, is_public_to_broadcaster } = req.body;

    await asset.update({
      category: category || asset.category,
      is_public_to_broadcaster: is_public_to_broadcaster !== undefined 
        ? (is_public_to_broadcaster === 'true' || is_public_to_broadcaster === true)
        : asset.is_public_to_broadcaster
    });

    res.status(200).json({
      success: true,
      message: 'Asset metadata updated successfully',
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download asset
// @route   GET /api/assets/:id/download
// @access  Private
exports.downloadAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: ['project']
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Security check for broadcaster
    if (req.user.role === 'broadcaster') {
      if (asset.project.client_id !== req.user.id || !asset.is_public_to_broadcaster) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke file ini'
        });
      }
    }

    // Check if file exists
    try {
      await fs.access(asset.file_path);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${asset.file_name}"`);
    res.setHeader('Content-Type', asset.file_type);

    // Stream file to response
    const fileStream = require('fs').createReadStream(asset.file_path);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin, Producer, Uploader)
exports.deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check if user is uploader or has admin/producer role
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'producer' && 
      asset.uploaded_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this asset'
      });
    }

    // Delete physical file
    try {
      await fs.unlink(asset.file_path);
    } catch (err) {
      console.error('Error deleting physical file:', err);
    }

    // Delete database record
    await asset.destroy();

    res.status(200).json({
      success: true,
      message: 'File dihapus permanen'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets for broadcaster (public only)
// @route   GET /api/assets/broadcaster/my-files
// @access  Private (Broadcaster)
exports.getBroadcasterAssets = async (req, res, next) => {
  try {
    // Get projects where user is client
    const projects = await Project.findAll({
      where: { client_id: req.user.id },
      attributes: ['id']
    });

    const projectIds = projects.map(p => p.id);

    const assets = await Asset.findAll({
      where: {
        project_id: projectIds,
        is_public_to_broadcaster: true
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        },
        {
          model: Episode,
          as: 'episode',
          attributes: ['id', 'title', 'episode_number'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Group by category
    const groupedAssets = {
      scripts: assets.filter(a => a.category === 'Script'),
      contracts: assets.filter(a => a.category === 'Contract'),
      previews: assets.filter(a => a.category === 'Preview Video'),
      masters: assets.filter(a => a.category === 'Master Video'),
      others: assets.filter(a => a.category === 'Other')
    };

    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
      grouped: groupedAssets
    });
  } catch (error) {
    next(error);
  }
};
