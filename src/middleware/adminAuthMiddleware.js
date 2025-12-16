const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
        
        // Check if admin still exists and is active
        const adminQuery = `
            SELECT id, username, email, full_name, role, permissions, is_active
            FROM admin_users 
            WHERE id = $1 AND is_active = true
        `;
        const result = await query(adminQuery, [decoded.adminId]);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. Admin not found or inactive.' 
            });
        }

        req.admin = result.rows[0];
        next();

    } catch (error) {
        console.error('Admin auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired.' 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Admin role-based authorization middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const adminRole = req.admin.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(adminRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions' 
            });
        }

        next();
    };
};

// Admin permission-based authorization middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const permissions = req.admin.permissions || {};
        
        // Super admin has all permissions
        if (req.admin.role === 'super_admin') {
            return next();
        }

        // Check specific permission
        if (!permissions[permission]) {
            return res.status(403).json({ 
                success: false, 
                message: `Permission '${permission}' required` 
            });
        }

        next();
    };
};

// Log admin activity middleware
const logAdminActivity = (action, targetType = null) => {
    return async (req, res, next) => {
        // Store original res.json to intercept response
        const originalJson = res.json;
        
        res.json = function(data) {
            // Log activity after response is sent
            setImmediate(async () => {
                try {
                    if (req.admin && req.admin.id) {
                        const targetId = req.params.id || req.body.id || null;
                        const details = {
                            method: req.method,
                            path: req.path,
                            body: req.body,
                            query: req.query,
                            params: req.params
                        };

                        await query(
                            'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            [
                                req.admin.id,
                                action,
                                targetType,
                                targetId,
                                JSON.stringify(details),
                                req.ip,
                                req.get('User-Agent')
                            ]
                        );
                    }
                } catch (error) {
                    console.error('Error logging admin activity:', error);
                }
            });

            // Call original res.json
            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = {
    adminAuth,
    requireRole,
    requirePermission,
    logAdminActivity
};

