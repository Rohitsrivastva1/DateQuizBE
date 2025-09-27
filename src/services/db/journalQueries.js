const db = require('../../config/db');

// Create a new journal entry
const createJournal = async (journalData) => {
  const { userId, partnerId, date, theme, isPrivate, unlockDate } = journalData;
  
  const query = `
    INSERT INTO journals (user_id, partner_id, date, theme, is_private, unlock_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [userId, partnerId, date, theme, isPrivate, unlockDate];
  const result = await db.query(query, values);
  return result.rows[0];
};

// Get journal by user ID and date
const getJournalByDate = async (userId, date) => {
  const query = `
    SELECT j.*, u.username as creator_username
    FROM journals j
    JOIN users u ON j.user_id = u.id
    WHERE (j.user_id = $1 OR j.partner_id = $1) AND j.date = $2
    ORDER BY j.created_at DESC
    LIMIT 1
  `;
  
  const result = await db.query(query, [userId, date]);
  return result.rows[0] || null;
};

// Get calendar data for a specific month
const getCalendarData = async (userId, year, month) => {
  const query = `
    SELECT 
      j.date,
      COUNT(jm.message_id) as message_count,
      COUNT(CASE WHEN jm.type = 'image' THEN 1 END) as image_count,
      COUNT(CASE WHEN jm.type = 'audio' THEN 1 END) as audio_count,
      j.pinned_message_id,
      pm.content as pinned_content,
      pm.type as pinned_type,
      j.user_id as creator_id,
      u.username as creator_username
    FROM journals j
    LEFT JOIN journal_messages jm ON j.journal_id = jm.journal_id
    LEFT JOIN journal_messages pm ON j.pinned_message_id = pm.message_id
    LEFT JOIN users u ON j.user_id = u.id
    WHERE (j.user_id = $1 OR j.partner_id = $1)
    AND EXTRACT(YEAR FROM j.date) = $2 
    AND EXTRACT(MONTH FROM j.date) = $3
    GROUP BY j.journal_id, j.date, j.pinned_message_id, pm.content, pm.type, j.user_id, u.username
    ORDER BY j.date
  `;
  
  const result = await db.query(query, [userId, year, month]);
  return result.rows;
};

// Update journal
const updateJournal = async (journalId, updateData) => {
  const { theme, pinnedMessageId, isPrivate, unlockDate } = updateData;
  
  const query = `
    UPDATE journals 
    SET theme = $1, pinned_message_id = $2, is_private = $3, unlock_date = $4, updated_at = CURRENT_TIMESTAMP
    WHERE journal_id = $5
    RETURNING *
  `;
  
  const values = [theme, pinnedMessageId, isPrivate, unlockDate, journalId];
  const result = await db.query(query, values);
  return result.rows[0];
};

// Delete journal
const deleteJournal = async (journalId) => {
  const query = `DELETE FROM journals WHERE journal_id = $1 RETURNING *`;
  const result = await db.query(query, [journalId]);
  return result.rows[0];
};

// Get journal statistics
const getJournalStats = async (userId) => {
  const query = `
    SELECT 
      COUNT(DISTINCT j.journal_id) as total_journals,
      COUNT(DISTINCT jm.message_id) as total_messages,
      COUNT(DISTINCT CASE WHEN jm.type = 'image' THEN jm.message_id END) as total_images,
      COUNT(DISTINCT CASE WHEN jm.type = 'audio' THEN jm.message_id END) as total_audio,
      COUNT(DISTINCT jr.reaction_id) as total_reactions,
      MIN(j.date) as first_journal_date,
      MAX(j.date) as last_journal_date
    FROM journals j
    LEFT JOIN journal_messages jm ON j.journal_id = jm.journal_id
    LEFT JOIN journal_reactions jr ON jm.message_id = jr.message_id
    WHERE (j.user_id = $1 OR j.partner_id = $1)
  `;
  
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

// Check if user is part of a couple (simplified - just check if user has partner_id)
const isUserInCouple = async (userId, partnerId) => {
  const query = `
    SELECT id FROM users 
    WHERE id = $1 AND partner_id = $2
  `;
  
  const result = await db.query(query, [userId, partnerId]);
  return result.rows.length > 0;
};

// Get journal timeline for a couple
const getJournalTimeline = async (userId) => {
  const query = `
    SELECT 
      j.journal_id,
      j.theme as title,
      j.date,
      j.created_at,
      j.user_id,
      u.username,
      COUNT(jm.message_id) as message_count
    FROM journals j
    JOIN users u ON j.user_id = u.id
    LEFT JOIN journal_messages jm ON j.journal_id = jm.journal_id
    WHERE (j.user_id = $1 OR j.partner_id = $1)
    GROUP BY j.journal_id, j.theme, j.date, j.created_at, j.user_id, u.username
    ORDER BY j.date DESC, j.created_at DESC
    LIMIT 50
  `;
  
  const result = await db.query(query, [userId]);
  return result.rows;
};

module.exports = {
  createJournal,
  getJournalByDate,
  getCalendarData,
  updateJournal,
  deleteJournal,
  getJournalStats,
  isUserInCouple,
  getJournalTimeline
};