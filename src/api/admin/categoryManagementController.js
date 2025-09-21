const { query } = require('../../config/db');

// Get all categories with pagination and filters
const getAllCategories = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            is_active = '',
            sort_by = 'sort_order', 
            sort_order = 'ASC' 
        } = req.query;

        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 0;

        // Build WHERE clause
        let whereConditions = [];
        
        if (search) {
            paramCount++;
            whereConditions.push(`(qc.name ILIKE $${paramCount} OR qc.description ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        if (is_active !== '') {
            paramCount++;
            whereConditions.push(`qc.is_active = $${paramCount}`);
            params.push(is_active === 'true');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Validate sort parameters
        const allowedSortFields = ['id', 'name', 'sort_order', 'is_active', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'sort_order';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const categoriesQuery = `
            SELECT 
                qc.id, qc.name, qc.description, qc.color, qc.icon,
                qc.is_active, qc.sort_order, qc.created_at, qc.updated_at,
                au.username as created_by_username,
                COUNT(q.id) as question_count
            FROM question_categories qc
            LEFT JOIN admin_users au ON qc.created_by = au.id
            LEFT JOIN questions q ON qc.id = q.category_id
            ${whereClause}
            GROUP BY qc.id, qc.name, qc.description, qc.color, qc.icon, 
                     qc.is_active, qc.sort_order, qc.created_at, qc.updated_at, au.username
            ORDER BY qc.${sortField} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(categoriesQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT qc.id) as total
            FROM question_categories qc
            ${whereClause}
        `;
        const countResult = await query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            categories: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get all categories error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch categories',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get all categories (simple list for dropdowns)
const getAllCategoriesSimple = async (req, res) => {
    try {
        const categoriesQuery = `
            SELECT id, name, color, icon, is_active, sort_order
            FROM question_categories
            WHERE is_active = true
            ORDER BY sort_order ASC, name ASC
        `;

        const result = await query(categoriesQuery);

        res.json({
            success: true,
            categories: result.rows
        });

    } catch (error) {
        console.error('Get all categories simple error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch categories',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const categoryQuery = `
            SELECT 
                qc.*, 
                au.username as created_by_username,
                COUNT(q.id) as question_count
            FROM question_categories qc
            LEFT JOIN admin_users au ON qc.created_by = au.id
            LEFT JOIN questions q ON qc.id = q.category_id
            WHERE qc.id = $1
            GROUP BY qc.id, qc.name, qc.description, qc.color, qc.icon, 
                     qc.is_active, qc.sort_order, qc.created_at, qc.updated_at, au.username
        `;

        const result = await query(categoryQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            category: result.rows[0]
        });

    } catch (error) {
        console.error('Get category by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Create new category
const createCategory = async (req, res) => {
    try {
        const {
            name,
            description = '',
            color = '#3B82F6',
            icon = '',
            is_active = true,
            sort_order = 0
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Check if category name already exists
        const checkQuery = 'SELECT id FROM question_categories WHERE name = $1';
        const checkResult = await query(checkQuery, [name]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        // Validate color format (hex color)
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (color && !colorRegex.test(color)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid color format. Use hex color (e.g., #3B82F6)'
            });
        }

        const insertQuery = `
            INSERT INTO question_categories (
                name, description, color, icon, is_active, sort_order, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            name,
            description,
            color,
            icon,
            is_active,
            sort_order,
            req.admin.id
        ];

        const result = await query(insertQuery, values);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: result.rows[0]
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            color,
            icon,
            is_active,
            sort_order
        } = req.body;

        // Check if category exists
        const checkQuery = 'SELECT id FROM question_categories WHERE id = $1';
        const checkResult = await query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if new name conflicts with existing category
        if (name) {
            const nameCheckQuery = 'SELECT id FROM question_categories WHERE name = $1 AND id != $2';
            const nameCheckResult = await query(nameCheckQuery, [name, id]);

            if (nameCheckResult.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        // Validate color format if provided
        if (color) {
            const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!colorRegex.test(color)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid color format. Use hex color (e.g., #3B82F6)'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 0;

        if (name !== undefined) {
            paramCount++;
            updateFields.push(`name = $${paramCount}`);
            values.push(name);
        }

        if (description !== undefined) {
            paramCount++;
            updateFields.push(`description = $${paramCount}`);
            values.push(description);
        }

        if (color !== undefined) {
            paramCount++;
            updateFields.push(`color = $${paramCount}`);
            values.push(color);
        }

        if (icon !== undefined) {
            paramCount++;
            updateFields.push(`icon = $${paramCount}`);
            values.push(icon);
        }

        if (is_active !== undefined) {
            paramCount++;
            updateFields.push(`is_active = $${paramCount}`);
            values.push(is_active);
        }

        if (sort_order !== undefined) {
            paramCount++;
            updateFields.push(`sort_order = $${paramCount}`);
            values.push(sort_order);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        paramCount++;
        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const updateQuery = `
            UPDATE question_categories 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(updateQuery, values);

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: result.rows[0]
        });

    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const checkQuery = 'SELECT id FROM question_categories WHERE id = $1';
        const checkResult = await query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has questions
        const questionsQuery = 'SELECT COUNT(*) as count FROM questions WHERE category_id = $1';
        const questionsResult = await query(questionsQuery, [id]);

        if (parseInt(questionsResult.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing questions. Please reassign or delete questions first.'
            });
        }

        const deleteQuery = 'DELETE FROM question_categories WHERE id = $1';
        await query(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Update category sort order
const updateCategorySortOrder = async (req, res) => {
    try {
        const { categories } = req.body;

        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                message: 'Categories array is required'
            });
        }

        // Validate each category object
        for (const category of categories) {
            if (!category.id || typeof category.sort_order !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'Each category must have id and sort_order'
                });
            }
        }

        // Update sort orders
        const updatePromises = categories.map(category => {
            const updateQuery = 'UPDATE question_categories SET sort_order = $1 WHERE id = $2';
            return query(updateQuery, [category.sort_order, category.id]);
        });

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: 'Category sort order updated successfully'
        });

    } catch (error) {
        console.error('Update category sort order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update category sort order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_categories,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_categories,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_categories,
                AVG(question_count) as avg_questions_per_category
            FROM (
                SELECT 
                    qc.id, 
                    qc.is_active,
                    COUNT(q.id) as question_count
                FROM question_categories qc
                LEFT JOIN questions q ON qc.id = q.category_id
                GROUP BY qc.id, qc.is_active
            ) as category_stats
        `;

        const result = await query(statsQuery);

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('Get category stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch category statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    getAllCategories,
    getAllCategoriesSimple,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategorySortOrder,
    getCategoryStats
};

