const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getSupportData,
  getFAQsByCategory,
  submitSupportTicket,
  searchFAQs,
  getTicketStatus,
  getUserTickets,
  rateFAQ,
  getChannelAvailability,
  getPopularFAQs,
  uploadAttachment,
  initLiveChatSession
} = require('../controllers/supportController');
const { authenticateToken, optionalAuthenticate } = require('../middleware/auth');
const { 
  validateSupportTicket,
  validateFAQSearch,
  validateFAQRating
} = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/support');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Public routes (no authentication required)
router.get('/data', getSupportData);
router.get('/faqs', getFAQsByCategory);
router.get('/faqs/search', validateFAQSearch, searchFAQs);
router.get('/faqs/popular', getPopularFAQs);
router.get('/tickets/:ticketId/status', getTicketStatus);
router.get('/channels/:channelId/availability', getChannelAvailability);

// Protected routes (authentication optional/required)
router.post('/tickets', optionalAuthenticate, validateSupportTicket, submitSupportTicket);
router.post('/faqs/rate', optionalAuthenticate, validateFAQRating, rateFAQ);
router.post('/attachments/upload', optionalAuthenticate, upload.single('file'), uploadAttachment);
router.post('/live-chat/sessions', optionalAuthenticate, initLiveChatSession);

// User-specific routes (requires authentication)
router.get('/tickets/user/:userId', authenticateToken, getUserTickets);

module.exports = router;