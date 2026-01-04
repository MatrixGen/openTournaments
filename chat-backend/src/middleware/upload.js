// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// ============================================
// UPLOAD CONFIGURATION
// ============================================
const UPLOAD_CONFIG = {
  //BASE_DIR: process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), 'uploads'),
  BASE_DIR: '/var/www/uploads',
  MESSAGES_DIR: 'messages',
  TEMP_DIR: 'temp',
  THUMBNAILS_DIR: 'thumbnails',
  PUBLIC_URL_BASE: process.env.UPLOAD_PUBLIC_URL || 'https://uploads.open-tournament.com',
  
  MAX_FILE_SIZES: {
    file: 50 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    image: 10 * 1024 * 1024,
    audio: 20 * 1024 * 1024,
    default: 10 * 1024 * 1024
  },
  
  ALLOWED_MIME_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
    file: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'
    ]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const getUploadPaths = () => {
  const messagesDir = path.join(UPLOAD_CONFIG.BASE_DIR, UPLOAD_CONFIG.MESSAGES_DIR);
  const tempDir = path.join(messagesDir, UPLOAD_CONFIG.TEMP_DIR);
  const thumbnailsDir = path.join(messagesDir, UPLOAD_CONFIG.THUMBNAILS_DIR);
  
  return {
    baseDir: UPLOAD_CONFIG.BASE_DIR,
    messagesDir,
    tempDir,
    thumbnailsDir,
    
    getPublicUrl: (filePath) => {
      const relativePath = path.relative(UPLOAD_CONFIG.BASE_DIR, filePath);
      return `${UPLOAD_CONFIG.PUBLIC_URL_BASE}/${relativePath.replace(/\\/g, '/')}`;
    },
    
    getAbsolutePath: (publicUrl) => {
      try {
        const urlPath = new URL(publicUrl).pathname;
        return path.join(UPLOAD_CONFIG.BASE_DIR, urlPath);
      } catch (error) {
        throw new Error(`Invalid public URL: ${publicUrl}`);
      }
    },
    
    moveToPermanent: async (tempPath, type) => {
      const fileExtension = path.extname(tempPath);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const permanentDir = messagesDir; // Changed: messagesDir is already the permanent directory
      const newPath = path.join(permanentDir, uniqueFileName);
      
      // Ensure permanent directory exists
      await fs.mkdir(permanentDir, { recursive: true });
      
      // Move file
      await fs.rename(tempPath, newPath);
      
      return {
        absolutePath: newPath,
        publicUrl: getUploadPaths().getPublicUrl(newPath),
        filename: uniqueFileName
      };
    },
    
    cleanupFile: async (filePath) => {
      if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  };
};

// Ensure all upload directories exist
const ensureUploadDirectories = async () => {
  const paths = getUploadPaths();
  
  try {
    await fs.mkdir(paths.tempDir, { recursive: true });
    await fs.mkdir(paths.messagesDir, { recursive: true });
    await fs.mkdir(paths.thumbnailsDir, { recursive: true });
    
    return paths;
  } catch (error) {
    console.error('Failed to create upload directories:', error.message);
    throw new Error('Failed to initialize upload directories');
  }
};

// Initialize directories on module load in production
if (process.env.NODE_ENV === 'production') {
  ensureUploadDirectories().catch(console.error);
}

// ============================================
// MULTER CONFIGURATION (ONLY FOR MULTIPART)
// ============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const paths = getUploadPaths();
      await fs.mkdir(paths.tempDir, { recursive: true });
      cb(null, paths.tempDir);
    } catch (error) {
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    cb(null, `temp_${safeName}_${uniqueSuffix}${ext}`);
  }
});

// File filter with dynamic limits based on message type
const fileFilter = (req, file, cb) => {
   
  const messageType = req.body.type || 'file';
  const allowedTypes = UPLOAD_CONFIG.ALLOWED_MIME_TYPES[messageType] || 
                      [...UPLOAD_CONFIG.ALLOWED_MIME_TYPES.file];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type for ${messageType}: ${file.mimetype}. ` +
        `Allowed types: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// Get file size limit based on message type
const getFileSizeLimit = (messageType = 'file') => {
  return UPLOAD_CONFIG.MAX_FILE_SIZES[messageType] || 
         UPLOAD_CONFIG.MAX_FILE_SIZES.default;
};

// Create multer instance with dynamic limits
const multerUpload = multer({
  storage,
  fileFilter,
  limits: (req, file, cb) => {
    const messageType = req.body.type || 'file';
    cb(null, {
      fileSize: getFileSizeLimit(messageType),
      files: 1
    });
  }
});

// ============================================
// CONTENT TYPE HANDLING MIDDLEWARE
// ============================================
/**
 * Middleware to handle different content types:
 * - application/x-www-form-urlencoded (text messages)
 * - multipart/form-data (messages with files)
 */
const handleContentType = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    // Use multer for file uploads
    multerUpload.single('file')(req, res, (err) => {
      if (err) {
        // Handle multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const messageType = req.body.type || 'file';
            const maxSizeMB = getFileSizeLimit(messageType) / (1024 * 1024);
            return res.status(400).json({
              error: 'File too large',
              message: `File exceeds maximum size of ${maxSizeMB}MB for ${messageType}`
            });
          }
          return res.status(400).json({
            error: 'Upload error',
            message: err.message
          });
        }
        return res.status(400).json({
          error: 'Invalid file',
          message: err.message
        });
      }
      next();
    });
  } else if (contentType.includes('application/x-www-form-urlencoded') || 
             contentType.includes('application/json')) {
    // For URL-encoded or JSON, no file upload, just continue
    // Body parser middleware should have already parsed the body
    next();
  } else {
    // Unsupported content type
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/x-www-form-urlencoded, application/json, or multipart/form-data'
    });
  }
};

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================
// Middleware to add upload utilities to request
const uploadUtils = (req, res, next) => {
  req.uploadUtils = getUploadPaths();
  next();
};

// Validation middleware for uploads
const validateUpload = (req, res, next) => {
  // If no file, skip validation
  if (!req.file) {
    return next();
  }
  
  const messageType = req.body.type || 'file';
  const maxSize = getFileSizeLimit(messageType);
  
  if (req.file.size > maxSize) {
    // Clean up the uploaded file
    const paths = getUploadPaths();
    paths.cleanupFile(req.file.path);
    
    const maxSizeMB = maxSize / (1024 * 1024);
    return res.status(400).json({
      error: 'File too large',
      message: `File exceeds maximum size of ${maxSizeMB}MB for ${messageType}`,
      maxSize: maxSize,
      actualSize: req.file.size
    });
  }
  
  // Additional validation can be added here
  next();
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Main middleware for handling uploads
  handleUpload: handleContentType,
  
  // Individual components (for specific use cases)
  multerUpload, // Direct multer instance if needed elsewhere
  
  // Utility middlewares
  uploadUtils,
  validateUpload,
  
  // Configuration and helpers
  UPLOAD_CONFIG,
  getUploadPaths,
  ensureUploadDirectories,
  getFileSizeLimit
};