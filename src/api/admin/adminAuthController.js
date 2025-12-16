const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');

// Admin login
const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Find admin user
        const adminQuery = `
            SELECT id, username, email, password_hash, full_name, role, permissions, is_active, last_login
            FROM admin_users 
            WHERE username = $1 AND is_active = true
        `;
        const result = await query(adminQuery, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const admin = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Update last login
        await query(
            'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
            [admin.id]
        );

        // Log admin activity
        await query(
            'INSERT INTO admin_activity_logs (admin_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [admin.id, 'login', req.ip, req.get('User-Agent')]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin.id, 
                username: admin.username, 
                role: admin.role,
                permissions: admin.permissions
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
            { expiresIn: '8h' }
        );

        // Remove password from response
        const { password_hash, ...adminWithoutPassword } = admin;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: adminWithoutPassword
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.admin.id;

        const adminQuery = `
            SELECT id, username, email, full_name, role, permissions, is_active, last_login, created_at
            FROM admin_users 
            WHERE id = $1
        `;
        const result = await query(adminQuery, [adminId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Admin not found' 
            });
        }

        res.json({
            success: true,
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Get admin profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Create new admin user
const createAdmin = async (req, res) => {
    try {
        const { username, email, password, full_name, role = 'admin', permissions = {} } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Check if admin already exists
        const existingAdmin = await query(
            'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Admin with this username or email already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        const createQuery = `
            INSERT INTO admin_users (username, email, password_hash, full_name, role, permissions)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, email, full_name, role, permissions, is_active, created_at
        `;
        const result = await query(createQuery, [
            username, email, hashedPassword, full_name, role, JSON.stringify(permissions)
        ]);

        // Log admin creation
        await query(
            'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.admin.id, 'create_admin', 'admin', result.rows[0].id, JSON.stringify({ username, email, role })]
        );

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { full_name, email } = req.body;

        const updateQuery = `
            UPDATE admin_users 
            SET full_name = COALESCE($1, full_name), 
                email = COALESCE($2, email),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, username, email, full_name, role, permissions, is_active, last_login, updated_at
        `;
        const result = await query(updateQuery, [full_name, email, adminId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Admin not found' 
            });
        }

        // Log profile update
        await query(
            'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
            [adminId, 'update_profile', 'admin', adminId, JSON.stringify({ full_name, email })]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Update admin profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Change admin password
const changePassword = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password and new password are required' 
            });
        }

        // Get current password hash
        const adminQuery = 'SELECT password_hash FROM admin_users WHERE id = $1';
        const result = await query(adminQuery, [adminId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Admin not found' 
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await query(
            'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedNewPassword, adminId]
        );

        // Log password change
        await query(
            'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id) VALUES ($1, $2, $3, $4)',
            [adminId, 'change_password', 'admin', adminId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get admin activity logs
const getAdminActivityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, admin_id, action } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (admin_id) {
            paramCount++;
            whereClause += ` AND admin_id = $${paramCount}`;
            params.push(admin_id);
        }

        if (action) {
            paramCount++;
            whereClause += ` AND action = $${paramCount}`;
            params.push(action);
        }

        const logsQuery = `
            SELECT 
                al.*,
                au.username as admin_username,
                au.full_name as admin_full_name
            FROM admin_activity_logs al
            JOIN admin_users au ON al.admin_id = au.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(logsQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM admin_activity_logs al
            JOIN admin_users au ON al.admin_id = au.id
            ${whereClause}
        `;
        const countResult = await query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get admin activity logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    adminLogin,
    getAdminProfile,
    createAdmin,
    updateAdminProfile,
    changePassword,
    getAdminActivityLogs
};

