const express = require('express');
const router = express.Router();
const {
  login,
  register,
  logout,
  getMe,
  updateProfile,
  updatePassword
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.post('/login', login);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/update-password', updatePassword);

// Admin only routes
router.post('/register', authorize('admin'), register);

module.exports = router;
