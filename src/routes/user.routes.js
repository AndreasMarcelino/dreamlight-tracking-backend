const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// User CRUD routes
router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// User statistics
router.get('/:id/stats', getUserStats);

module.exports = router;