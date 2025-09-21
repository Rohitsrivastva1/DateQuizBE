const express = require('express');
const router = express.Router();
const { uploadMiddleware, uploadExcelFile, getUploadTemplate } = require('./bulkUploadController');
const { adminAuth } = require('../../middleware/adminAuthMiddleware');

// Apply admin authentication to all routes
router.use(adminAuth);

// Upload Excel file and create questions
router.post('/upload', uploadMiddleware, uploadExcelFile);

// Download Excel template
router.get('/template', getUploadTemplate);

module.exports = router;
