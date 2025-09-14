const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authmiddleware');
const {
    getTodaysQuestion,
    getTodaysQuestionPreview,
    submitAnswer,
    getUserStats,
    setCoupleName,
    getNotifications,
    markNotificationRead,
    getQuestionHistory,
    clearAllNotifications,
    getMissedQuestions,
    submitAnswerForQuestion
} = require('./dailyQuestionsController');

// Public route - no login required
router.get('/today-preview', getTodaysQuestionPreview); // Free question of the day

// All other routes are protected with authentication
router.use(protect);

// Get today's question (full access)
router.get('/today', getTodaysQuestion);

// Submit answer to today's question
router.post('/answer', submitAnswer);

// Get user stats (streaks and love meter)
router.get('/stats', getUserStats);

// Set couple name
router.post('/couple-name', setCoupleName);

// Get notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.put('/notifications/:notificationId/read', markNotificationRead);

// Clear all notifications for the user
router.delete('/notifications/clear-all', clearAllNotifications);

// Get question history
router.get('/history', getQuestionHistory);

// Get missed questions and streak warning
router.get('/missed', getMissedQuestions);

// Submit answer for a specific question (for missed questions)
router.post('/answer-question', submitAnswerForQuestion);

module.exports = router;
