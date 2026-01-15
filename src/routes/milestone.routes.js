const express = require('express');
const router = express.Router();
const {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  getCrewTasks
} = require('../controllers/milestone.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Crew specific routes
router.get('/crew/my-tasks', authorize('crew'), getCrewTasks);

// Status update (crew can update their own)
router.patch('/:id/status', updateMilestoneStatus);

// General milestone routes
router.route('/')
  .get(getMilestones)
  .post(authorize('admin', 'producer'), createMilestone);

router.route('/:id')
  .get(getMilestoneById)
  .put(authorize('admin', 'producer'), updateMilestone)
  .delete(authorize('admin', 'producer'), deleteMilestone);

module.exports = router;
