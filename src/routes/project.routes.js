const express = require('express');
const router = express.Router();
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getBroadcasterProjects,
  getInvestorProjects
} = require('../controllers/project.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Broadcaster specific routes
router.get('/broadcaster/my-projects', 
  authorize('broadcaster'), 
  getBroadcasterProjects
);

// Investor specific routes
router.get('/investor/my-investments', 
  authorize('investor'), 
  getInvestorProjects
);

// General project routes
router.route('/')
  .get(getAllProjects)
  .post(authorize('admin', 'producer'), createProject);

router.route('/:id')
  .get(getProjectById)
  .put(authorize('admin', 'producer'), updateProject)
  .delete(authorize('admin'), deleteProject);

module.exports = router;
