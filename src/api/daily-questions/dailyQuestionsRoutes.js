const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authmiddleware');
const {
    getTodaysQuestion,
    submitAnswer,
    getUserStats,
    getCoupleName,
    setCoupleName,
    getNotifications,
    markNotificationRead,
    getQuestionHistory,
    clearAllNotifications,
    getMissedQuestions,
    submitAnswerForQuestion
} = require('./dailyQuestionsController');

// All routes are protected with authentication
router.use(protect);

// Get today's question
router.get('/today', getTodaysQuestion);

// Submit answer to today's question
router.post('/answer', submitAnswer);

// Get user stats (streaks and love meter)
router.get('/stats', getUserStats);

// Get couple name
router.get('/couple-name', getCoupleName);

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
