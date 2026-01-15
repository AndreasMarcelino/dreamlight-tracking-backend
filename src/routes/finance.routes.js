const express = require('express');
const router = express.Router();
const {
  getFinances,
  getFinanceById,
  createFinance,
  updateFinance,
  deleteFinance,
  getPendingPayroll,
  payCrew,
  getFinanceSummary
} = require('../controllers/finance.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Finance summary (available for all authenticated users)
router.get('/summary', getFinanceSummary);

// Payroll routes (Admin, Producer only)
router.get('/payroll/pending', 
  authorize('admin', 'producer'), 
  getPendingPayroll
);

router.post('/pay-crew', 
  authorize('admin', 'producer'), 
  payCrew
);

// General finance routes (Admin, Producer only)
router.route('/')
  .get(authorize('admin', 'producer'), getFinances)
  .post(authorize('admin', 'producer'), createFinance);

router.route('/:id')
  .get(authorize('admin', 'producer'), getFinanceById)
  .put(authorize('admin', 'producer'), updateFinance)
  .delete(authorize('admin'), deleteFinance);

module.exports = router;
