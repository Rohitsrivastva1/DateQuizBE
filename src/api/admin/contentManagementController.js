const { query } = require('../../config/db');

// ==================== QUESTION CATEGORIES ====================

// Get all question categories
const getQuestionCategories = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', is_active = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (is_active !== '') {
            paramCount++;
            whereClause += ` AND is_active = $${paramCount}`;
            params.push(is_active === 'true');
        }

        const categoriesQuery = `
            SELECT 
                qc.*,
                au.username as created_by_username,
                COUNT(q.id) as question_count
            FROM question_categories qc
            LEFT JOIN admin_users au ON qc.created_by = au.id
            LEFT JOIN questions q ON qc.id = q.category_id
            ${whereClause}
            GROUP BY qc.id, au.username
            ORDER BY qc.sort_order ASC, qc.name ASC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(categoriesQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
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
        console.error('Get question categories error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Create new question category
const createQuestionCategory = async (req, res) => {
    try {
        const { name, description, color, icon, sort_order = 0 } = req.body;

        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category name is required' 
            });
        }

        // Check if category already exists
        const existingCategory = await query(
            'SELECT id FROM question_categories WHERE name = $1',
            [name]
        );

        if (existingCategory.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Category with this name already exists' 
            });
        }

        const createQuery = `
            INSERT INTO question_categories (name, description, color, icon, sort_order, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await query(createQuery, [
            name, description, color, icon, sort_order, req.admin.id
        ]);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: result.rows[0]
        });

    } catch (error) {
        console.error('Create question category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update question category
const updateQuestionCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color, icon, sort_order, is_active } = req.body;

        // Check if category exists
        const categoryExists = await query('SELECT id FROM question_categories WHERE id = $1', [id]);
        if (categoryExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }

        // Check for duplicate name
        if (name) {
            const duplicateCategory = await query(
                'SELECT id FROM question_categories WHERE name = $1 AND id != $2',
                [name, id]
            );

            if (duplicateCategory.rows.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Category with this name already exists' 
                });
            }
        }

        const updateQuery = `
            UPDATE question_categories 
            SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                color = COALESCE($3, color),
                icon = COALESCE($4, icon),
                sort_order = COALESCE($5, sort_order),
                is_active = COALESCE($6, is_active),
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `;

        const result = await query(updateQuery, [name, description, color, icon, sort_order, is_active, id]);

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: result.rows[0]
        });

    } catch (error) {
        console.error('Update question category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Delete question category
const deleteQuestionCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const categoryExists = await query('SELECT id, name FROM question_categories WHERE id = $1', [id]);
        if (categoryExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }

        // Check if category has questions
        const questionsCount = await query(
            'SELECT COUNT(*) as count FROM questions WHERE category_id = $1',
            [id]
        );

        if (parseInt(questionsCount.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete category with existing questions' 
            });
        }

        await query('DELETE FROM question_categories WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete question category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// ==================== QUESTIONS ====================

// Get all questions with filters
const getQuestions = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            pack_id = '', 
            category_id = '', 
            is_active = '',
            is_premium = '',
            difficulty_level = '',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            whereClause += ` AND q.question_text ILIKE $${paramCount}`;
            params.push(`%${search}%`);
        }

        if (pack_id) {
            paramCount++;
            whereClause += ` AND q.pack_id = $${paramCount}`;
            params.push(pack_id);
        }

        if (category_id) {
            paramCount++;
            whereClause += ` AND q.category_id = $${paramCount}`;
            params.push(category_id);
        }

        if (is_active !== '') {
            paramCount++;
            whereClause += ` AND q.is_active = $${paramCount}`;
            params.push(is_active === 'true');
        }

        if (is_premium !== '') {
            paramCount++;
            whereClause += ` AND q.is_premium = $${paramCount}`;
            params.push(is_premium === 'true');
        }

        if (difficulty_level) {
            paramCount++;
            whereClause += ` AND q.difficulty_level = $${paramCount}`;
            params.push(difficulty_level);
        }

        // Validate sort parameters
        const allowedSortFields = ['id', 'question_text', 'difficulty_level', 'is_active', 'is_premium', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const questionsQuery = `
            SELECT 
                q.*,
                p.title as pack_title,
                qc.name as category_name,
                qc.color as category_color,
                au.username as created_by_username
            FROM questions q
            LEFT JOIN packs p ON q.pack_id = p.id
            LEFT JOIN question_categories qc ON q.category_id = qc.id
            LEFT JOIN admin_users au ON q.created_by = au.id
            ${whereClause}
            ORDER BY q.${sortField} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(questionsQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM questions q
            ${whereClause}
        `;
        const countResult = await query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            questions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Create new question
const createQuestion = async (req, res) => {
    try {
        const { 
            pack_id, 
            category_id, 
            question_text, 
            question_type = 'text', 
            options, 
            difficulty_level = 1, 
            is_premium = false, 
            tags = [] 
        } = req.body;

        if (!pack_id || !question_text) {
            return res.status(400).json({ 
                success: false, 
                message: 'Pack ID and question text are required' 
            });
        }

        // Check if pack exists
        const packExists = await query('SELECT id FROM packs WHERE id = $1', [pack_id]);
        if (packExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pack not found' 
            });
        }

        // Check if category exists (if provided)
        if (category_id) {
            const categoryExists = await query('SELECT id FROM question_categories WHERE id = $1', [category_id]);
            if (categoryExists.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Category not found' 
                });
            }
        }

        const createQuery = `
            INSERT INTO questions (
                pack_id, category_id, question_text, question_type, options, 
                difficulty_level, is_premium, tags, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await query(createQuery, [
            pack_id, category_id, question_text, question_type, 
            options ? JSON.stringify(options) : null, 
            difficulty_level, is_premium, tags, req.admin.id
        ]);

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update question
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            pack_id, 
            category_id, 
            question_text, 
            question_type, 
            options, 
            difficulty_level, 
            is_active, 
            is_premium, 
            tags 
        } = req.body;

        // Check if question exists
        const questionExists = await query('SELECT id FROM questions WHERE id = $1', [id]);
        if (questionExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Question not found' 
            });
        }

        // Check if pack exists (if provided)
        if (pack_id) {
            const packExists = await query('SELECT id FROM packs WHERE id = $1', [pack_id]);
            if (packExists.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Pack not found' 
                });
            }
        }

        // Check if category exists (if provided)
        if (category_id) {
            const categoryExists = await query('SELECT id FROM question_categories WHERE id = $1', [category_id]);
            if (categoryExists.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Category not found' 
                });
            }
        }

        const updateQuery = `
            UPDATE questions 
            SET 
                pack_id = COALESCE($1, pack_id),
                category_id = COALESCE($2, category_id),
                question_text = COALESCE($3, question_text),
                question_type = COALESCE($4, question_type),
                options = COALESCE($5, options),
                difficulty_level = COALESCE($6, difficulty_level),
                is_active = COALESCE($7, is_active),
                is_premium = COALESCE($8, is_premium),
                tags = COALESCE($9, tags),
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `;

        const result = await query(updateQuery, [
            pack_id, category_id, question_text, question_type,
            options ? JSON.stringify(options) : options,
            difficulty_level, is_active, is_premium, tags, id
        ]);

        res.json({
            success: true,
            message: 'Question updated successfully',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Delete question
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if question exists
        const questionExists = await query('SELECT id FROM questions WHERE id = $1', [id]);
        if (questionExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Question not found' 
            });
        }

        await query('DELETE FROM questions WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });

    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get question by ID
const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        const questionQuery = `
            SELECT 
                q.*,
                p.title as pack_title,
                qc.name as category_name,
                qc.color as category_color,
                au.username as created_by_username
            FROM questions q
            LEFT JOIN packs p ON q.pack_id = p.id
            LEFT JOIN question_categories qc ON q.category_id = qc.id
            LEFT JOIN admin_users au ON q.created_by = au.id
            WHERE q.id = $1
        `;

        const result = await query(questionQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Question not found' 
            });
        }

        res.json({
            success: true,
            question: result.rows[0]
        });

    } catch (error) {
        console.error('Get question by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    // Question Categories
    getQuestionCategories,
    createQuestionCategory,
    updateQuestionCategory,
    deleteQuestionCategory,
    
    // Questions
    getQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion
};

