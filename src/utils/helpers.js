// Format currency to Rupiah
exports.formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Format date to Indonesian format
exports.formatDate = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
};

// Calculate percentage
exports.calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Generate random string
exports.generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Sanitize filename
exports.sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9.]/gi, '_')
    .toLowerCase();
};

// Parse pagination params
exports.getPagination = (page = 1, size = 10) => {
  const limit = size ? +size : 10;
  const offset = page ? (page - 1) * limit : 0;

  return { limit, offset };
};

// Format pagination response
exports.getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    totalItems,
    items,
    totalPages,
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Async handler wrapper (untuk menghindari try-catch berulang)
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Response success format
exports.successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// Response error format
exports.errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Calculate project burn rate
exports.calculateBurnRate = (totalExpense, totalBudget) => {
  if (totalBudget === 0) return 0;
  return Math.round((totalExpense / totalBudget) * 100);
};

// Calculate ROI
exports.calculateROI = (income, expense, investment) => {
  const netProfit = income - expense;
  if (investment === 0) return 0;
  return parseFloat(((netProfit / investment) * 100).toFixed(2));
};

// Group array by key
exports.groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

// Sleep/delay function (untuk testing)
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Check if date is past
exports.isPastDeadline = (date) => {
  return new Date(date) < new Date();
};

// Get time remaining
exports.getTimeRemaining = (deadline) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;

  if (diff <= 0) {
    return 'Overdue';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} remaining`;
  }
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
};
