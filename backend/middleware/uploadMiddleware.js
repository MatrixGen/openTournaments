const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// ============================================
// UPLOAD BASE DIRECTORY (PROD vs DEV)
// ============================================

const IS_PROD = process.env.NODE_ENV === 'production';

// Production-safe absolute path (served by nginx/CDN)
const PROD_UPLOAD_DIR = '/var/www/uploads';

// Development fallback (inside project root)
const DEV_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Choose directory explicitly
const UPLOAD_BASE_DIR = IS_PROD ? PROD_UPLOAD_DIR : DEV_UPLOAD_DIR;

// Ensure directory exists
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

if (!IS_PROD) {
  console.warn(`[UPLOAD] Development mode: files will be stored in ${UPLOAD_BASE_DIR}`);
}

// ============================================
// MULTER STORAGE
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_BASE_DIR);
  },

  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);

    const sanitizedBaseName =
      baseName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80) || 'upload';

    const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`);
  }
});

// ============================================
// FILE FILTER
// ============================================

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only images, videos, and PDFs are allowed.'),
      false
    );
  }
};

// ============================================
// MULTER INSTANCE
// ============================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

// ============================================
// PUBLIC MIDDLEWARE
// ============================================

const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res
              .status(400)
              .json({ message: 'File too large. Maximum size is 50MB.' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res
              .status(400)
              .json({ message: 'Too many files. Only one file allowed.' });
          }
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle,
  UPLOAD_BASE_DIR // exported for debugging/logging if needed
};
