const { query } = require('../../config/db');

// Get all questions with pagination and filters
const getAllQuestions = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            category_id = '', 
            question_type = '',
            difficulty_level = '',
            is_active = '',
            sort_by = 'created_at', 
            sort_order = 'DESC' 
        } = req.query;

        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 0;

        // Build WHERE clause
        let whereConditions = [];
        
        if (search) {
            paramCount++;
            whereConditions.push(`q.question_text ILIKE $${paramCount}`);
            params.push(`%${search}%`);
        }

        if (category_id) {
            paramCount++;
            whereConditions.push(`q.category_id = $${paramCount}`);
            params.push(category_id);
        }

        if (question_type) {
            paramCount++;
            whereConditions.push(`q.question_type = $${paramCount}`);
            params.push(question_type);
        }

        if (difficulty_level) {
            paramCount++;
            whereConditions.push(`q.difficulty_level = $${paramCount}`);
            params.push(difficulty_level);
        }

        if (is_active !== '') {
            paramCount++;
            whereConditions.push(`q.is_active = $${paramCount}`);
            params.push(is_active === 'true');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Validate sort parameters
        const allowedSortFields = ['id', 'question_text', 'question_type', 'difficulty_level', 'is_active', 'updated_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'updated_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const questionsQuery = `
            SELECT 
                q.id, q.question_text, q.question_type, q.options, 
                q.difficulty_level, q.is_active, q.is_premium, q.tags,
                q.updated_at,
                qc.name as category_name, qc.color as category_color,
                p.title as pack_title, p.id as pack_id,
                au.username as created_by_username
            FROM questions q
            LEFT JOIN question_categories qc ON q.category_id = qc.id
            LEFT JOIN packs p ON q.pack_id = p.id
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
            LEFT JOIN question_categories qc ON q.category_id = qc.id
            LEFT JOIN packs p ON q.pack_id = p.id
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
        console.error('Get all questions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch questions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
                qc.name as category_name, qc.color as category_color,
                p.title as pack_title, p.id as pack_id,
                au.username as created_by_username
            FROM questions q
            LEFT JOIN question_categories qc ON q.category_id = qc.id
            LEFT JOIN packs p ON q.pack_id = p.id
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
            message: 'Failed to fetch question',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Create new question
const createQuestion = async (req, res) => {
    try {
        const {
            question_text,
            pack_id,
            category_id,
            question_type = 'text',
            options = null,
            difficulty_level = 1,
            is_active = true,
            is_premium = false,
            tags = []
        } = req.body;

        // Validate required fields
        if (!question_text || !pack_id) {
            return res.status(400).json({
                success: false,
                message: 'Question text and pack ID are required'
            });
        }

        // Validate question type
        const validTypes = ['text', 'multiple_choice', 'rating', 'yes_no'];
        if (!validTypes.includes(question_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question type'
            });
        }

        // Validate difficulty level
        if (difficulty_level < 1 || difficulty_level > 5) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty level must be between 1 and 5'
            });
        }

        const insertQuery = `
            INSERT INTO questions (
                question_text, pack_id, category_id, question_type, 
                options, difficulty_level, is_active, is_premium, 
                tags, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            question_text,
            pack_id,
            category_id || null,
            question_type,
            options ? JSON.stringify(options) : null,
            difficulty_level,
            is_active,
            is_premium,
            tags,
            req.admin.id
        ];

        const result = await query(insertQuery, values);

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create question',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Update question
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            question_text,
            pack_id,
            category_id,
            question_type,
            options,
            difficulty_level,
            is_active,
            is_premium,
            tags
        } = req.body;

        // Check if question exists
        const checkQuery = 'SELECT id FROM questions WHERE id = $1';
        const checkResult = await query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 0;

        if (question_text !== undefined) {
            paramCount++;
            updateFields.push(`question_text = $${paramCount}`);
            values.push(question_text);
        }

        if (pack_id !== undefined) {
            paramCount++;
            updateFields.push(`pack_id = $${paramCount}`);
            values.push(pack_id);
        }

        if (category_id !== undefined) {
            paramCount++;
            updateFields.push(`category_id = $${paramCount}`);
            values.push(category_id);
        }

        if (question_type !== undefined) {
            const validTypes = ['text', 'multiple_choice', 'rating', 'yes_no'];
            if (!validTypes.includes(question_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid question type'
                });
            }
            paramCount++;
            updateFields.push(`question_type = $${paramCount}`);
            values.push(question_type);
        }

        if (options !== undefined) {
            paramCount++;
            updateFields.push(`options = $${paramCount}`);
            values.push(options ? JSON.stringify(options) : null);
        }

        if (difficulty_level !== undefined) {
            if (difficulty_level < 1 || difficulty_level > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Difficulty level must be between 1 and 5'
                });
            }
            paramCount++;
            updateFields.push(`difficulty_level = $${paramCount}`);
            values.push(difficulty_level);
        }

        if (is_active !== undefined) {
            paramCount++;
            updateFields.push(`is_active = $${paramCount}`);
            values.push(is_active);
        }

        if (is_premium !== undefined) {
            paramCount++;
            updateFields.push(`is_premium = $${paramCount}`);
            values.push(is_premium);
        }

        if (tags !== undefined) {
            paramCount++;
            updateFields.push(`tags = $${paramCount}`);
            values.push(tags);
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
            UPDATE questions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(updateQuery, values);

        res.json({
            success: true,
            message: 'Question updated successfully',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update question',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Delete question
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if question exists
        const checkQuery = 'SELECT id FROM questions WHERE id = $1';
        const checkResult = await query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        const deleteQuery = 'DELETE FROM questions WHERE id = $1';
        await query(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });

    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete question',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Bulk operations
const bulkUpdateQuestions = async (req, res) => {
    try {
        const { question_ids, updates } = req.body;

        if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Question IDs array is required'
            });
        }

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Updates object is required'
            });
        }

        // Validate updates
        const allowedFields = ['is_active', 'is_premium', 'difficulty_level', 'category_id'];
        const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field));

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const placeholders = question_ids.map((_, index) => `$${index + 1}`).join(',');
        const setClause = updateFields.map((field, index) => `${field} = $${question_ids.length + index + 1}`).join(', ');

        const values = [...question_ids, ...updateFields.map(field => updates[field])];

        const updateQuery = `
            UPDATE questions 
            SET ${setClause}, updated_at = NOW()
            WHERE id IN (${placeholders})
            RETURNING id, question_text, is_active, is_premium
        `;

        const result = await query(updateQuery, values);

        res.json({
            success: true,
            message: `Updated ${result.rows.length} questions successfully`,
            updated_questions: result.rows
        });

    } catch (error) {
        console.error('Bulk update questions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to bulk update questions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkUpdateQuestions
};
