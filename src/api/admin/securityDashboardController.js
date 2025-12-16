const logStorageService = require('../../services/security/logStorageService');
const alertService = require('../../services/security/alertService');
const { logger } = require('../../utils/secureLogger');

// Get security dashboard data
const getSecurityDashboard = async (req, res) => {
  try {
    const {
      timeRange = '24h', // 1h, 24h, 7d, 30d
      limit = 100
    } = req.query;

    // Calculate time range
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeRangeMs = timeRanges[timeRange] || timeRanges['24h'];
    const startDate = new Date(Date.now() - timeRangeMs).toISOString();

    // Get recent security events
    const recentEvents = await logStorageService.searchLogs('', {
      startDate,
      limit: parseInt(limit)
    });

    // Get log statistics
    const logStats = await logStorageService.getLogStatistics();

    // Calculate security metrics
    const metrics = calculateSecurityMetrics(recentEvents?.results || []);

    // Get security alerts summary
    const alertsSummary = await getAlertsSummary(recentEvents?.results || []);

    // Get top security events
    const topEvents = getTopSecurityEvents(recentEvents?.results || []);

    // Get security trends
    const trends = getSecurityTrends(recentEvents?.results || []);

    const dashboardData = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics,
      alertsSummary,
      topEvents,
      trends,
      logStats: {
        totalFiles: logStats?.totalFiles || 0,
        totalSizeMB: logStats?.totalSizeMB || 0,
        retentionDays: logStats?.retentionDays || 30
      },
      recentEvents: recentEvents?.results?.slice(0, 20) || []
    };

    logger.info('Security dashboard accessed', {
      userId: req.user?.id,
      timeRange,
      eventCount: recentEvents?.results?.length || 0
    });

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Failed to get security dashboard', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load security dashboard',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Get security events
const getSecurityEvents = async (req, res) => {
  try {
    const {
      query = '',
      level = null,
      event = null,
      startDate = null,
      endDate = null,
      limit = 100,
      offset = 0
    } = req.query;

    const searchResults = await logStorageService.searchLogs(query, {
      level,
      event,
      startDate,
      endDate,
      limit: parseInt(limit) + parseInt(offset)
    });

    const events = searchResults?.results?.slice(parseInt(offset)) || [];

    res.json({
      success: true,
      data: {
        events,
        total: searchResults?.total || 0,
        processedFiles: searchResults?.processedFiles || 0,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: events.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get security events', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load security events',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Get security metrics
const getSecurityMetrics = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeRangeMs = timeRanges[timeRange] || timeRanges['24h'];
    const startDate = new Date(Date.now() - timeRangeMs).toISOString();

    const recentEvents = await logStorageService.searchLogs('', {
      startDate,
      limit: 1000
    });

    const metrics = calculateSecurityMetrics(recentEvents?.results || []);

    res.json({
      success: true,
      data: {
        timeRange,
        metrics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get security metrics', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load security metrics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Test alert system
const testAlertSystem = async (req, res) => {
  try {
    await alertService.testAlertSystem();

    logger.info('Alert system test initiated', {
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Alert system test initiated. Check your email for test alert.'
    });

  } catch (error) {
    logger.error('Failed to test alert system', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to test alert system',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Get log statistics
const getLogStatistics = async (req, res) => {
  try {
    const logStats = await logStorageService.getLogStatistics();

    res.json({
      success: true,
      data: logStats
    });

  } catch (error) {
    logger.error('Failed to get log statistics', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load log statistics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Helper function to calculate security metrics
function calculateSecurityMetrics(events) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const metrics = {
    total: events.length,
    bySeverity: {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    },
    byEvent: {},
    byHour: {},
    byDay: {},
    recent: {
      lastHour: 0,
      lastDay: 0
    },
    trends: {
      increasing: [],
      decreasing: [],
      stable: []
    }
  };

  // Process events
  events.forEach(event => {
    const eventTime = new Date(event.timestamp);
    
    // Count by severity
    if (event.severity) {
      metrics.bySeverity[event.severity] = (metrics.bySeverity[event.severity] || 0) + 1;
    }

    // Count by event type
    const eventType = event.event || 'unknown';
    metrics.byEvent[eventType] = (metrics.byEvent[eventType] || 0) + 1;

    // Count by hour
    const hourKey = eventTime.toISOString().substring(0, 13);
    metrics.byHour[hourKey] = (metrics.byHour[hourKey] || 0) + 1;

    // Count by day
    const dayKey = eventTime.toISOString().substring(0, 10);
    metrics.byDay[dayKey] = (metrics.byDay[dayKey] || 0) + 1;

    // Recent events
    if (eventTime > oneHourAgo) {
      metrics.recent.lastHour++;
    }
    if (eventTime > oneDayAgo) {
      metrics.recent.lastDay++;
    }
  });

  // Calculate trends
  const sortedDays = Object.keys(metrics.byDay).sort();
  if (sortedDays.length >= 2) {
    const recentDays = sortedDays.slice(-3);
    const olderDays = sortedDays.slice(-6, -3);
    
    recentDays.forEach(day => {
      const recentCount = metrics.byDay[day] || 0;
      const olderCount = olderDays.reduce((sum, d) => sum + (metrics.byDay[d] || 0), 0) / olderDays.length;
      
      if (recentCount > olderCount * 1.2) {
        metrics.trends.increasing.push(day);
      } else if (recentCount < olderCount * 0.8) {
        metrics.trends.decreasing.push(day);
      } else {
        metrics.trends.stable.push(day);
      }
    });
  }

  return metrics;
}

// Helper function to get alerts summary
function getAlertsSummary(events) {
  const highSeverityEvents = events.filter(e => e.severity === 'HIGH');
  const mediumSeverityEvents = events.filter(e => e.severity === 'MEDIUM');
  const lowSeverityEvents = events.filter(e => e.severity === 'LOW');

  return {
    total: events.length,
    high: highSeverityEvents.length,
    medium: mediumSeverityEvents.length,
    low: lowSeverityEvents.length,
    recentHigh: highSeverityEvents.slice(0, 5),
    needsAttention: highSeverityEvents.length > 0 || mediumSeverityEvents.length > 10
  };
}

// Helper function to get top security events
function getTopSecurityEvents(events) {
  const eventCounts = {};
  
  events.forEach(event => {
    const eventType = event.event || 'unknown';
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
  });

  return Object.entries(eventCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([event, count]) => ({ event, count }));
}

// Helper function to get security trends
function getSecurityTrends(events) {
  const hourlyData = {};
  const now = new Date();
  
  // Initialize last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = hour.toISOString().substring(0, 13);
    hourlyData[hourKey] = 0;
  }

  // Count events by hour
  events.forEach(event => {
    const eventTime = new Date(event.timestamp);
    const hourKey = eventTime.toISOString().substring(0, 13);
    if (hourlyData.hasOwnProperty(hourKey)) {
      hourlyData[hourKey]++;
    }
  });

  return Object.entries(hourlyData)
    .map(([hour, count]) => ({
      hour: hour.substring(11, 13) + ':00',
      count,
      timestamp: hour
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

module.exports = {
  getSecurityDashboard,
  getSecurityEvents,
  getSecurityMetrics,
  testAlertSystem,
  getLogStatistics
};
