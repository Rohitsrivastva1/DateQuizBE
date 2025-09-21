const express = require('express');
const router = express.Router();
const {
  getDailyQuestions,
  getDailyQuestionById,
  createDailyQuestion,
  updateDailyQuestion,
  deleteDailyQuestion,
  getDailyQuestionStats
} = require('./dailyQuestionsController');
const { adminAuth, requirePermission, logAdminActivity } = require('../../middleware/adminAuthMiddleware');

// Apply admin authentication to all routes
router.use(adminAuth);

// Get daily questions with filters and pagination
router.get('/', 
  requirePermission('questions'),
  logAdminActivity('view_daily_questions'),
  getDailyQuestions
);

// Get single daily question by ID
router.get('/:id', 
  requirePermission('questions'),
  getDailyQuestionById
);

// Create new daily question
router.post('/', 
  requirePermission('questions'),
  logAdminActivity('create_daily_question'),
  createDailyQuestion
);

// Update daily question
router.put('/:id', 
  requirePermission('questions'),
  logAdminActivity('update_daily_question'),
  updateDailyQuestion
);

// Delete daily question
router.delete('/:id', 
  requirePermission('questions'),
  logAdminActivity('delete_daily_question'),
  deleteDailyQuestion
);

// Get daily question statistics
router.get('/stats/overview', 
  requirePermission('questions'),
  getDailyQuestionStats
);

module.exports = router;
