const { Pool } = require('pg');
const pool = require('../../config/db');

// Get all daily questions with filters and pagination
const getDailyQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      is_active = '',
      date_from = '',
      date_to = '',
      sort_by = 'question_date',
      sort_order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    // Add category filter
    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    // Add active status filter
    if (is_active !== '') {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      queryParams.push(is_active === 'true');
    }

    // Add date range filters
    if (date_from) {
      paramCount++;
      whereClause += ` AND question_date >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereClause += ` AND question_date <= $${paramCount}`;
      queryParams.push(date_to);
    }

    // Validate sort parameters
    const allowedSortFields = ['question_date', 'question_text', 'category', 'is_active', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'question_date';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM daily_questions ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get questions with pagination
    const questionsQuery = `
      SELECT 
        id,
        question as question_text,
        category,
        question_date,
        is_active,
        created_at
      FROM daily_questions 
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), offset);
    
    const questionsResult = await pool.query(questionsQuery, queryParams);
    
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      questions: questionsResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching daily questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily questions'
    });
  }
};

// Get single daily question by ID
const getDailyQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id,
        question as question_text,
        category,
        question_date,
        is_active,
        created_at
      FROM daily_questions 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily question not found'
      });
    }

    res.json({
      success: true,
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching daily question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily question'
    });
  }
};

// Create new daily question
const createDailyQuestion = async (req, res) => {
  try {
    const { question_text, category = 'general', question_date, is_active = true } = req.body;

    // Validate required fields
    if (!question_text || !question_date) {
      return res.status(400).json({
        success: false,
        message: 'Question text and date are required'
      });
    }

    // Check if question already exists for this date
    const existingQuery = 'SELECT id FROM daily_questions WHERE question_date = $1';
    const existingResult = await pool.query(existingQuery, [question_date]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A question already exists for this date'
      });
    }

    // Insert new question
    const insertQuery = `
      INSERT INTO daily_questions (question, category, question_date, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, question as question_text, category, question_date, is_active, created_at
    `;
    
    const result = await pool.query(insertQuery, [
      question_text,
      category,
      question_date,
      is_active
    ]);

    res.status(201).json({
      success: true,
      message: 'Daily question created successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating daily question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create daily question'
    });
  }
};

// Update daily question
const updateDailyQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, category, question_date, is_active } = req.body;

    // Check if question exists
    const existingQuery = 'SELECT id FROM daily_questions WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily question not found'
      });
    }

    // Check if new date conflicts with existing question (excluding current question)
    if (question_date) {
      const conflictQuery = 'SELECT id FROM daily_questions WHERE question_date = $1 AND id != $2';
      const conflictResult = await pool.query(conflictQuery, [question_date, id]);
      
      if (conflictResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A question already exists for this date'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (question_text !== undefined) {
      paramCount++;
      updateFields.push(`question = $${paramCount}`);
      updateValues.push(question_text);
    }

    if (category !== undefined) {
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      updateValues.push(category);
    }

    if (question_date !== undefined) {
      paramCount++;
      updateFields.push(`question_date = $${paramCount}`);
      updateValues.push(question_date);
    }

    if (is_active !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE daily_questions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, question as question_text, category, question_date, is_active, created_at
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Daily question updated successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating daily question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daily question'
    });
  }
};

// Delete daily question
const deleteDailyQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const existingQuery = 'SELECT id FROM daily_questions WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily question not found'
      });
    }

    // Delete the question
    const deleteQuery = 'DELETE FROM daily_questions WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'Daily question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting daily question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete daily question'
    });
  }
};

// Get daily question statistics
const getDailyQuestionStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_questions,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_questions,
        COUNT(CASE WHEN question_date = CURRENT_DATE THEN 1 END) as today_questions,
        COUNT(CASE WHEN question_date > CURRENT_DATE THEN 1 END) as future_questions,
        COUNT(CASE WHEN question_date < CURRENT_DATE THEN 1 END) as past_questions
      FROM daily_questions
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      stats: {
        total_questions: parseInt(stats.total_questions),
        active_questions: parseInt(stats.active_questions),
        inactive_questions: parseInt(stats.inactive_questions),
        today_questions: parseInt(stats.today_questions),
        future_questions: parseInt(stats.future_questions),
        past_questions: parseInt(stats.past_questions)
      }
    });
  } catch (error) {
    console.error('Error fetching daily question stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily question statistics'
    });
  }
};

module.exports = {
  getDailyQuestions,
  getDailyQuestionById,
  createDailyQuestion,
  updateDailyQuestion,
  deleteDailyQuestion,
  getDailyQuestionStats
};
