const express = require('express');
const router = express.Router();
const {
  getAssets,
  getAssetById,
  uploadAsset,
  updateAsset,
  downloadAsset,
  deleteAsset,
  getBroadcasterAssets
} = require('../controllers/asset.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateAsset, validate } = require('../middleware/validation.middleware');
const upload = require('../middleware/upload.middleware');

// All routes require authentication
router.use(protect);

// Broadcaster specific routes
router.get('/broadcaster/my-files', 
  authorize('broadcaster'), 
  getBroadcasterAssets
);

// Download route (all authenticated users can download based on permissions)
router.get('/:id/download', downloadAsset);

// General asset routes
router.route('/')
  .get(getAssets)
  .post(
    authorize('admin', 'producer'), 
    upload.single('file'),
    validateAsset,
    validate,
    uploadAsset
  );

router.route('/:id')
  .get(getAssetById)
  .put(
    authorize('admin', 'producer'),
    validateAsset,
    validate,
    updateAsset
  )
  .delete(
    authorize('admin', 'producer'),
    deleteAsset
  );

module.exports = router;