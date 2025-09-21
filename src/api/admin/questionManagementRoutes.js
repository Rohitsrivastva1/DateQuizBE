const express = require('express');
const router = express.Router();
const {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkUpdateQuestions
} = require('./questionManagementController');
const { adminAuth, requirePermission, logAdminActivity } = require('../../middleware/adminAuthMiddleware');

// Apply admin authentication to all routes
router.use(adminAuth);

// Get all questions with pagination and filters
router.get('/', 
    requirePermission('questions'),
    logAdminActivity('view_questions'),
    getAllQuestions
);

// Get question by ID
router.get('/:id', 
    requirePermission('questions'),
    logAdminActivity('view_question'),
    getQuestionById
);

// Create new question
router.post('/', 
    requirePermission('questions'),
    logAdminActivity('create_question'),
    createQuestion
);

// Update question
router.put('/:id', 
    requirePermission('questions'),
    logAdminActivity('update_question'),
    updateQuestion
);

// Delete question
router.delete('/:id', 
    requirePermission('questions'),
    logAdminActivity('delete_question'),
    deleteQuestion
);

// Bulk update questions
router.patch('/bulk-update', 
    requirePermission('questions'),
    logAdminActivity('bulk_update_questions'),
    bulkUpdateQuestions
);

module.exports = router;
