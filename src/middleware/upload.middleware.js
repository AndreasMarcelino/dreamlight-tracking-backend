const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.body.project_id;
    
    // Create project-specific folder
    const projectDir = path.join(uploadDir, `project_${projectId}`);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    cb(null, projectDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    
    // Sanitize filename
    const sanitizedName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Define allowed file types by category
  const allowedTypes = {
    'Script': ['.pdf', '.doc', '.docx', '.txt'],
    'Contract': ['.pdf', '.doc', '.docx'],
    'Preview Video': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    'Master Video': ['.mp4', '.mov', '.avi', '.mkv', '.mxf', '.prores'],
    'Other': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.jpg', '.jpeg', '.png']
  };

  const category = req.body.category;
  const ext = path.extname(file.originalname).toLowerCase();

  // If category specified, check against allowed types
  if (category && allowedTypes[category]) {
    if (allowedTypes[category].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed for category ${category}`), false);
    }
  } else {
    // If no category or unknown category, allow common file types
    const commonTypes = [
      '.pdf', '.doc', '.docx', '.txt',
      '.mp4', '.mov', '.avi', '.mkv',
      '.jpg', '.jpeg', '.png', '.gif',
      '.zip', '.rar'
    ];

    if (commonTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
  }
});

// Error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024}MB`
      });
    }
    
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    // Other errors (like file filter errors)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
