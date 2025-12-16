const express = require('express');
const router = express.Router();
const { adminAuth, requireRole } = require('../../middleware/adminAuthMiddleware');
const {
  getSecurityDashboard,
  getSecurityEvents,
  getSecurityMetrics,
  testAlertSystem,
  getLogStatistics
} = require('./securityDashboardController');

// All routes require admin authentication
router.use(adminAuth);
router.use(requireRole(['super_admin', 'admin']));

// Get security dashboard overview
router.get('/dashboard', getSecurityDashboard);

// Get security events with filtering and pagination
router.get('/events', getSecurityEvents);

// Get security metrics
router.get('/metrics', getSecurityMetrics);

// Test alert system
router.post('/test-alerts', testAlertSystem);

// Get log statistics
router.get('/logs/stats', getLogStatistics);

module.exports = router;
