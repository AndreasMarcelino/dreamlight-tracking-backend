const { body, validationResult } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  
  next();
};

// Auth validations
exports.validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'producer', 'crew', 'broadcaster', 'investor'])
    .withMessage('Invalid role')
];

// Project validations
exports.validateProject = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('type')
    .isIn(['Movie', 'Series', 'Event', 'TVC'])
    .withMessage('Invalid project type'),
  body('total_budget_plan')
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('target_income')
    .isFloat({ min: 0 })
    .withMessage('Target income must be a positive number'),
  body('start_date')
    .isDate()
    .withMessage('Invalid start date'),
  body('deadline_date')
    .isDate()
    .withMessage('Invalid deadline date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.start_date)) {
        throw new Error('Deadline must be after start date');
      }
      return true;
    })
];

// Episode validations
exports.validateEpisode = [
  body('project_id')
    .isInt()
    .withMessage('Valid project ID is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('episode_number')
    .isInt({ min: 1 })
    .withMessage('Episode number must be a positive integer'),
  body('status')
    .isIn(['Scripting', 'Filming', 'Editing', 'Preview Ready', 'Master Ready'])
    .withMessage('Invalid status')
];

// Milestone validations
exports.validateMilestone = [
  body('project_id')
    .isInt()
    .withMessage('Valid project ID is required'),
  body('user_id')
    .isInt()
    .withMessage('Valid user ID is required'),
  body('task_name')
    .trim()
    .notEmpty()
    .withMessage('Task name is required'),
  body('phase_category')
    .isIn(['Pre-Production', 'Production', 'Post-Production', 'Master'])
    .withMessage('Invalid phase category'),
  body('honor_amount')
    .isFloat({ min: 0 })
    .withMessage('Honor amount must be a positive number')
];

// Finance validations
exports.validateFinance = [
  body('project_id')
    .isInt()
    .withMessage('Valid project ID is required'),
  body('type')
    .isIn(['Expense', 'Income'])
    .withMessage('Invalid transaction type'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('transaction_date')
    .isDate()
    .withMessage('Invalid transaction date'),
  body('status')
    .isIn(['Paid', 'Received', 'Pending'])
    .withMessage('Invalid status')
];

// Asset validations
exports.validateAsset = [
  body('project_id')
    .isInt()
    .withMessage('Valid project ID is required'),
  body('category')
    .isIn(['Script', 'Contract', 'Preview Video', 'Master Video', 'Other'])
    .withMessage('Invalid category'),
  body('is_public_to_broadcaster')
    .optional()
    .isBoolean()
    .withMessage('is_public_to_broadcaster must be a boolean')
];
