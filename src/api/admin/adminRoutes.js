const express = require('express');
const router = express.Router();

// Import controllers
const {
    adminLogin,
    getAdminProfile,
    createAdmin,
    updateAdminProfile,
    changePassword,
    getAdminActivityLogs
} = require('./adminAuthController');

const {
    getAllUsers,
    getUserById,
    updateUser,
    resetUserPassword,
    deleteUser,
    getUserStats,
    getUserActivityLogs
} = require('./userManagementController');

// Import question and category management controllers
const questionRoutes = require('./questionManagementRoutes');
const categoryRoutes = require('./categoryManagementRoutes');
const dailyQuestionsRoutes = require('./dailyQuestionsRoutes');
const bulkUploadRoutes = require('./bulkUploadRoutes');

const {
    sendEmailToUser,
    sendBulkEmail,
    getEmailCampaigns,
    getEmailCampaignDetails,
    deleteEmailCampaign
} = require('./emailController');

// Import middleware
const { adminAuth, requireRole, requirePermission, logAdminActivity } = require('../../middleware/adminAuthMiddleware');

// ==================== AUTHENTICATION ROUTES ====================

// Admin login (public)
router.post('/auth/login', adminLogin);

// All other routes require authentication
router.use(adminAuth);

// Admin profile routes
router.get('/auth/profile', getAdminProfile);
router.put('/auth/profile', updateAdminProfile);
router.put('/auth/change-password', changePassword);

// Admin management (super admin only)
router.post('/auth/create-admin', requireRole('super_admin'), createAdmin);

// Admin activity logs
router.get('/auth/activity-logs', getAdminActivityLogs);

// ==================== USER MANAGEMENT ROUTES ====================

// User management routes
router.get('/users', requirePermission('users'), getAllUsers);
router.get('/users/stats', requirePermission('users'), getUserStats);
router.get('/users/:id', requirePermission('users'), getUserById);
router.put('/users/:id', requirePermission('users'), logAdminActivity('update_user', 'user'), updateUser);
router.put('/users/:id/reset-password', requirePermission('users'), logAdminActivity('reset_user_password', 'user'), resetUserPassword);
router.delete('/users/:id', requirePermission('users'), logAdminActivity('delete_user', 'user'), deleteUser);
router.get('/users/:id/activity', requirePermission('users'), getUserActivityLogs);

// ==================== CONTENT MANAGEMENT ROUTES ====================

// Question and Category management routes
router.use('/questions', questionRoutes);
router.use('/categories', categoryRoutes);
router.use('/daily-questions', dailyQuestionsRoutes);
router.use('/bulk-upload', bulkUploadRoutes);

// ==================== EMAIL MANAGEMENT ROUTES ====================

// Email management routes
router.post('/emails/send-user', requirePermission('emails'), logAdminActivity('send_email', 'user'), sendEmailToUser);
router.post('/emails/send-bulk', requirePermission('emails'), logAdminActivity('send_bulk_email', 'campaign'), sendBulkEmail);
router.get('/emails/campaigns', requirePermission('emails'), getEmailCampaigns);
router.get('/emails/campaigns/:id', requirePermission('emails'), getEmailCampaignDetails);
router.delete('/emails/campaigns/:id', requirePermission('emails'), logAdminActivity('delete_email_campaign', 'campaign'), deleteEmailCampaign);

// ==================== ANALYTICS ROUTES ====================

// Test analytics route
router.get('/analytics/test', requirePermission('analytics'), async (req, res) => {
    try {
        console.log('Test analytics route called');
        res.json({
            success: true,
            message: 'Analytics test route working',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test analytics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get dashboard analytics
router.get('/analytics/dashboard', requirePermission('analytics'), async (req, res) => {
    try {
        console.log('Analytics dashboard request received');
        const { query } = require('../../config/db');

        // Get basic stats
        console.log('Getting basic stats...');
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users) as active_users,
                (SELECT COUNT(*) FROM questions) as total_questions,
                (SELECT COUNT(*) FROM question_categories) as total_categories,
                (SELECT COUNT(*) FROM user_daily_answers WHERE answered_at >= CURRENT_DATE) as today_answers,
                (SELECT COUNT(*) FROM partner_requests WHERE status = 'approved') as total_partnerships
        `;

        const statsResult = await query(statsQuery);
        const stats = statsResult.rows[0];
        console.log('Basic stats retrieved:', stats);

        // Get recent user registrations (last 30 days)
        console.log('Getting recent users...');
        const recentUsersQuery = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;
        const recentUsersResult = await query(recentUsersQuery);
        console.log('Recent users retrieved:', recentUsersResult.rows.length);

        // Get daily question answers (last 30 days)
        console.log('Getting daily answers...');
        const dailyAnswersQuery = `
            SELECT 
                DATE(answered_at) as date,
                COUNT(*) as count
            FROM user_daily_answers 
            WHERE answered_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(answered_at)
            ORDER BY date DESC
        `;
        const dailyAnswersResult = await query(dailyAnswersQuery);
        console.log('Daily answers retrieved:', dailyAnswersResult.rows.length);

        // Get top question categories
        console.log('Getting top categories...');
        const topCategoriesQuery = `
            SELECT 
                qc.name as category_name,
                qc.color,
                COUNT(q.id) as question_count
            FROM question_categories qc
            LEFT JOIN questions q ON qc.id = q.category_id
            GROUP BY qc.id, qc.name, qc.color
            ORDER BY question_count DESC
            LIMIT 10
        `;
        const topCategoriesResult = await query(topCategoriesQuery);
        console.log('Top categories retrieved:', topCategoriesResult.rows.length);

        console.log('Sending response...');
        res.json({
            success: true,
            analytics: {
                stats,
                recent_users: recentUsersResult.rows,
                daily_answers: dailyAnswersResult.rows,
                top_categories: topCategoriesResult.rows
            }
        });

    } catch (error) {
        console.error('Get dashboard analytics error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get user insights
router.get('/analytics/user-insights', requirePermission('analytics'), async (req, res) => {
    try {
        const { query } = require('../../config/db');

        // Get user engagement metrics
        const engagementQuery = `
            SELECT 
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT uda.user_id) as users_with_answers,
                ROUND(COUNT(DISTINCT uda.user_id)::decimal / COUNT(DISTINCT u.id) * 100, 2) as engagement_rate,
                AVG(ui.total_questions_answered) as avg_questions_per_user,
                AVG(ui.current_streak) as avg_current_streak,
                AVG(ui.longest_streak) as avg_longest_streak
            FROM users u
            LEFT JOIN user_daily_answers uda ON u.id = uda.user_id
            LEFT JOIN user_insights ui ON u.id = ui.user_id
        `;

        const engagementResult = await query(engagementQuery);

        // Get user activity by hour
        const activityByHourQuery = `
            SELECT 
                EXTRACT(hour FROM answered_at) as hour,
                COUNT(*) as answer_count
            FROM user_daily_answers 
            WHERE answered_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY EXTRACT(hour FROM answered_at)
            ORDER BY hour
        `;
        const activityByHourResult = await query(activityByHourQuery);

        // Get user retention (users who answered questions in last 7 days)
        const retentionQuery = `
            SELECT 
                COUNT(DISTINCT user_id) as active_users_7_days,
                COUNT(DISTINCT CASE WHEN answered_at >= CURRENT_DATE - INTERVAL '30 days' THEN user_id END) as active_users_30_days
            FROM user_daily_answers
        `;
        const retentionResult = await query(retentionQuery);

        res.json({
            success: true,
            insights: {
                engagement: engagementResult.rows[0],
                activity_by_hour: activityByHourResult.rows,
                retention: retentionResult.rows[0]
            }
        });

    } catch (error) {
        console.error('Get user insights error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// ==================== SYSTEM SETTINGS ROUTES ====================

// Get system settings
router.get('/settings', requirePermission('settings'), async (req, res) => {
    try {
        const { query } = require('../../config/db');

        const settingsQuery = `
            SELECT setting_key, setting_value, setting_type, description, is_public
            FROM system_settings
            ORDER BY setting_key
        `;

        const result = await query(settingsQuery);

        // Convert to object format
        const settings = {};
        result.rows.forEach(row => {
            let value = row.setting_value;
            
            // Convert based on type
            if (row.setting_type === 'number') {
                value = parseFloat(value);
            } else if (row.setting_type === 'boolean') {
                value = value === 'true';
            } else if (row.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = value;
                }
            }

            settings[row.setting_key] = {
                value,
                type: row.setting_type,
                description: row.description,
                is_public: row.is_public
            };
        });

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Update system settings
router.put('/settings', requirePermission('settings'), logAdminActivity('update_settings', 'settings'), async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ 
                success: false, 
                message: 'Settings object is required' 
            });
        }

        const { query } = require('../../config/db');

        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            let stringValue = value;
            
            // Convert to string based on type
            if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
            } else if (typeof value === 'boolean') {
                stringValue = value.toString();
            } else if (typeof value === 'number') {
                stringValue = value.toString();
            }

            await query(
                'UPDATE system_settings SET setting_value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3',
                [stringValue, req.admin.id, key]
            );
        }

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });

    } catch (error) {
        console.error('Update system settings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
