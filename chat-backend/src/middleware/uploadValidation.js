const multer = require('multer');
const path = require('path');
const FileType = require('file-type');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for validation

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file upload
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('File type not allowed'), false);
    }

    // Check MIME type
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('MIME type not allowed'), false);
    }

    cb(null, true);
  }
});

// Advanced file validation using file-type
const validateFile = async (fileBuffer, originalName) => {
  const fileType = await FileType.fromBuffer(fileBuffer);
  const extension = path.extname(originalName).toLowerCase();

  // Validate file signature matches extension
  const signatureMap = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain']
  };

  if (signatureMap[extension] && !signatureMap[extension].includes(fileType?.mime)) {
    throw new Error('File signature does not match extension');
  }

  return fileType;
};

// File scanning middleware (placeholder for actual virus scanning service)
const scanFileForThreats = async (fileBuffer) => {
  // In production, integrate with:
  // - ClamAV (open source)
  // - VirusTotal API
  // - AWS S3 Object Lambda
  // - Custom scanning service
  
  // For now, perform basic checks
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > maxSize) {
    throw new Error('File too large');
  }

  // Check for executable files disguised as other types
  const dangerousSignatures = [
    Buffer.from('4D5A', 'hex'), // EXE
    Buffer.from('7F454C46', 'hex'), // ELF
    Buffer.from('2321', 'hex') // Shell script
  ];

  for (const signature of dangerousSignatures) {
    if (fileBuffer.slice(0, signature.length).equals(signature)) {
      throw new Error('Potentially dangerous file type detected');
    }
  }

  return { isClean: true, threats: [] };
};

module.exports = {
  upload,
  validateFile,
  scanFileForThreats
};