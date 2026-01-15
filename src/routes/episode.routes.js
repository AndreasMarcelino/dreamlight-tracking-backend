const express = require('express');
const router = express.Router();
const {
  getEpisodes,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode
} = require('../controllers/episode.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getEpisodes)
  .post(authorize('admin', 'producer'), createEpisode);

router.route('/:id')
  .get(getEpisodeById)
  .put(authorize('admin', 'producer'), updateEpisode)
  .delete(authorize('admin', 'producer'), deleteEpisode);

module.exports = router;
