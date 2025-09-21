const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            status = '', 
            sort_by = 'created_at', 
            sort_order = 'DESC',
            city = '',
            age_min = '',
            age_max = ''
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Search filter
        if (search) {
            paramCount++;
            whereClause += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Status filter - simplified for now
        if (status) {
            // For now, we'll just return all users regardless of status
            // This can be enhanced later when we have proper status tracking
        }

        // City filter
        if (city) {
            paramCount++;
            whereClause += ` AND city ILIKE $${paramCount}`;
            params.push(`%${city}%`);
        }

        // Age range filter
        if (age_min) {
            paramCount++;
            whereClause += ` AND age >= $${paramCount}`;
            params.push(age_min);
        }

        if (age_max) {
            paramCount++;
            whereClause += ` AND age <= $${paramCount}`;
            params.push(age_max);
        }

        // Validate sort parameters
        const allowedSortFields = ['id', 'username', 'email', 'age', 'city', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const usersQuery = `
            SELECT 
                u.id, u.username, u.email, u.age, u.city, 
                'active' as status,
                true as email_verified,
                u.created_at, u.updated_at,
                ui.total_questions_answered, ui.current_streak, ui.longest_streak,
                ui.total_login_days, ui.partner_count, ui.premium_user
            FROM users u
            LEFT JOIN user_insights ui ON u.id = ui.user_id
            ${whereClause}
            ORDER BY u.${sortField} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(usersQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `;
        const countResult = await query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const userQuery = `
            SELECT 
                u.*,
                ui.total_questions_answered, ui.current_streak, ui.longest_streak,
                ui.total_login_days, ui.partner_count, ui.premium_user,
                ui.average_answers_per_day, ui.favorite_category, ui.last_updated
            FROM users u
            LEFT JOIN user_insights ui ON u.id = ui.user_id
            WHERE u.id = $1
        `;
        const result = await query(userQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update user details
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, age, city, status, email_verified } = req.body;

        // Check if user exists
        const userExists = await query('SELECT id FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Check for duplicate username/email
        if (username || email) {
            const duplicateQuery = `
                SELECT id FROM users 
                WHERE id != $1 AND (username = $2 OR email = $3)
            `;
            const duplicateResult = await query(duplicateQuery, [id, username, email]);
            
            if (duplicateResult.rows.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Username or email already exists' 
                });
            }
        }

        const updateQuery = `
            UPDATE users 
            SET 
                username = COALESCE($1, username),
                email = COALESCE($2, email),
                age = COALESCE($3, age),
                city = COALESCE($4, city),
                status = COALESCE($5, status),
                email_verified = COALESCE($6, email_verified),
                updated_at = NOW()
            WHERE id = $7
            RETURNING id, username, email, age, city, status, email_verified, created_at, updated_at
        `;

        const result = await query(updateQuery, [username, email, age, city, status, email_verified, id]);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Reset user password
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password is required' 
            });
        }

        // Check if user exists
        const userExists = await query('SELECT id FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, id]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const userExists = await query('SELECT id, username FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Delete user (cascade will handle related records)
        await query('DELETE FROM users WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
                COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30_days,
                COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_7_days,
                AVG(age) as average_age,
                COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as users_with_city
            FROM users
        `;

        const result = await query(statsQuery);
        const stats = result.rows[0];

        // Get top cities
        const citiesQuery = `
            SELECT city, COUNT(*) as user_count
            FROM users 
            WHERE city IS NOT NULL AND city != ''
            GROUP BY city 
            ORDER BY user_count DESC 
            LIMIT 10
        `;
        const citiesResult = await query(citiesQuery);

        // Get age distribution
        const ageDistributionQuery = `
            SELECT 
                CASE 
                    WHEN age < 18 THEN 'Under 18'
                    WHEN age BETWEEN 18 AND 24 THEN '18-24'
                    WHEN age BETWEEN 25 AND 34 THEN '25-34'
                    WHEN age BETWEEN 35 AND 44 THEN '35-44'
                    WHEN age BETWEEN 45 AND 54 THEN '45-54'
                    WHEN age >= 55 THEN '55+'
                END as age_group,
                COUNT(*) as count
            FROM users 
            WHERE age IS NOT NULL
            GROUP BY age_group
            ORDER BY 
                CASE 
                    WHEN age_group = 'Under 18' THEN 1
                    WHEN age_group = '18-24' THEN 2
                    WHEN age_group = '25-34' THEN 3
                    WHEN age_group = '35-44' THEN 4
                    WHEN age_group = '45-54' THEN 5
                    WHEN age_group = '55+' THEN 6
                END
        `;
        const ageDistributionResult = await query(ageDistributionQuery);

        res.json({
            success: true,
            stats: {
                ...stats,
                top_cities: citiesResult.rows,
                age_distribution: ageDistributionResult.rows
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get user activity logs
const getUserActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Check if user exists
        const userExists = await query('SELECT id, username FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get user's daily answers
        const answersQuery = `
            SELECT 
                'daily_answer' as activity_type,
                'Answered daily question' as description,
                uda.answered_at as timestamp,
                dq.question_text,
                uda.answer_text
            FROM user_daily_answers uda
            JOIN daily_questions dq ON uda.question_id = dq.id
            WHERE uda.user_id = $1
            ORDER BY uda.answered_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await query(answersQuery, [id, limit, offset]);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM user_daily_answers
            WHERE user_id = $1
        `;
        const countResult = await query(countQuery, [id]);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            user: userExists.rows[0],
            activities: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get user activity logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    resetUserPassword,
    deleteUser,
    getUserStats,
    getUserActivityLogs
};
