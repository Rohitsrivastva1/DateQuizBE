const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const tokenService = require('../../services/security/tokenService');
const userQueries = require('../../services/db/userQueries');

// Create table if not exists (lightweight safety)
const ensureTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        email TEXT,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error('Failed ensuring support_messages table:', e.message);
  }
};
ensureTable();

// Helper: attach user to req if Authorization header present
async function attachUserIfPresent(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = tokenService.verifyToken(token);
      if (decoded?.id) {
        const user = await userQueries.findUserById(decoded.id);
        if (user) req.user = user;
      }
    }
  } catch (e) {
    // ignore; endpoint remains public
  }
}

// Public endpoint to submit a support message (auth optional)
router.post('/submit', async (req, res) => {
  try {
    await attachUserIfPresent(req);
    const { category, message, email } = req.body;
    const userId = req.user?.id || null;
    const effectiveEmail = email || req.user?.email || null;

    if (!category || !message) {
      return res.status(400).json({ success: false, error: 'Category and message are required' });
    }

    const result = await query(
      'INSERT INTO support_messages (user_id, email, category, message) VALUES ($1,$2,$3,$4) RETURNING id, created_at',
      [userId, effectiveEmail, category, message]
    );

    return res.json({ success: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (error) {
    console.error('Support submit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit message' });
  }
});

module.exports = router;

