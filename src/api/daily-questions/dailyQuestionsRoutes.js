const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authmiddleware');
const {
    getTodaysQuestion,
    submitAnswer,
    getUserStats,
    setCoupleName,
    getNotifications,
    markNotificationRead,
    getQuestionHistory
} = require('./dailyQuestionsController');

// All routes are protected with authentication
router.use(protect);

// Get today's question
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

// Get question history
router.get('/history', getQuestionHistory);

module.exports = router;
