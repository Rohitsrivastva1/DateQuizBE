const db = require('../../config/db');

// Create a new message
const createMessage = async (messageData) => {
  const { journalId, senderId, type, content, mediaUrl, mediaMetadata, replyToMessageId } = messageData;
  
  const query = `
    INSERT INTO journal_messages (journal_id, sender_id, type, content, media_url, media_metadata, reply_to_message_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [journalId, senderId, type, content, mediaUrl, mediaMetadata, replyToMessageId];
  const result = await db.query(query, values);
  return result.rows[0];
};

// Get messages for a journal with pagination
const getMessages = async (journalId, limit = 20, offset = 0) => {
  const query = `
    SELECT 
      jm.*,
      u.username as sender_username,
      u.email as sender_email,
      COALESCE(reactions.reaction_count, 0) as reaction_count,
      COALESCE(reads.read_count, 0) as read_count,
      COALESCE(reactions.reactions, '[]'::json) as reactions
    FROM journal_messages jm
    JOIN users u ON jm.sender_id = u.id
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*) as reaction_count,
        json_agg(json_build_object(
          'user_id', jr.user_id,
          'emoji', jr.emoji
        ) ORDER BY jr.created_at ASC) as reactions
      FROM journal_reactions jr 
      WHERE jr.message_id = jm.message_id
    ) reactions ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as read_count
      FROM journal_read_receipts jrr 
      WHERE jrr.message_id = jm.message_id
    ) reads ON true
    WHERE jm.journal_id = $1
    ORDER BY jm.created_at ASC
    LIMIT $2 OFFSET $3
  `;

  const result = await db.query(query, [journalId, limit, offset]);

  // Ensure reactions array is present for each message, even if DB aggregation fails
  try {
    if (result.rows.length > 0) {
      const ids = result.rows.map(r => r.message_id);
      const reactRes = await db.query(
        `SELECT message_id, user_id, emoji FROM journal_reactions WHERE message_id = ANY($1::int[]) ORDER BY created_at ASC`,
        [ids]
      );
      const map = new Map();
      reactRes.rows.forEach(r => {
        if (!map.has(r.message_id)) map.set(r.message_id, []);
        map.get(r.message_id).push({ user_id: r.user_id, emoji: r.emoji });
      });
      result.rows.forEach(row => {
        row.reactions = row.reactions || map.get(row.message_id) || [];
        row.reaction_count = row.reaction_count ?? (row.reactions ? row.reactions.length : 0);
      });
    }
  } catch (e) {
    console.error('Error hydrating reactions for messages:', e);
  }

  return result.rows;
};

// Update message
const updateMessage = async (messageId, content) => {
  const query = `
    UPDATE journal_messages 
    SET content = $1, updated_at = CURRENT_TIMESTAMP
    WHERE message_id = $2
    RETURNING *
  `;
  
  const result = await db.query(query, [content, messageId]);
  return result.rows[0];
};

// Delete message
const deleteMessage = async (messageId) => {
  const query = `DELETE FROM journal_messages WHERE message_id = $1 RETURNING *`;
  const result = await db.query(query, [messageId]);
  return result.rows[0];
};

// Add reaction to message
const addReaction = async (messageId, userId, emoji) => {
  // Replace any existing reaction by this user for this message with the new emoji
  await db.query(`DELETE FROM journal_reactions WHERE message_id = $1 AND user_id = $2`, [messageId, userId]);
  const query = `
    INSERT INTO journal_reactions (message_id, user_id, emoji)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [messageId, userId, emoji]);
  return result.rows[0];
};

// Remove reaction from message
const removeReaction = async (messageId, userId, emoji) => {
  const query = `
    DELETE FROM journal_reactions 
    WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    RETURNING *
  `;
  
  const result = await db.query(query, [messageId, userId, emoji]);
  return result.rows[0];
};

// Mark message as read
const markAsRead = async (messageId, userId) => {
  const query = `
    INSERT INTO journal_read_receipts (message_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (message_id, user_id) DO NOTHING
    RETURNING *
  `;
  
  const result = await db.query(query, [messageId, userId]);
  return result.rows[0];
};

// Get message by ID
const getMessageById = async (messageId) => {
  const query = `
    SELECT 
      jm.*,
      u.username as sender_username,
      u.email as sender_email,
      COALESCE(reactions.reactions, '[]'::json) as reactions,
      COALESCE(reactions.reaction_count, 0) as reaction_count
    FROM journal_messages jm
    JOIN users u ON jm.sender_id = u.id
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*) as reaction_count,
        json_agg(json_build_object('user_id', jr.user_id, 'emoji', jr.emoji) ORDER BY jr.created_at ASC) as reactions
      FROM journal_reactions jr 
      WHERE jr.message_id = jm.message_id
    ) reactions ON true
    WHERE jm.message_id = $1
  `;
  const result = await db.query(query, [messageId]);
  return result.rows[0];
};

// Check if user has access to journal
const hasJournalAccess = async (userId, journalId) => {
  const query = `
    SELECT j.journal_id 
    FROM journals j
    WHERE j.journal_id = $1 AND (j.user_id = $2 OR j.partner_id = $2)
  `;
  
  const result = await db.query(query, [journalId, userId]);
  return result.rows.length > 0;
};

// Check if user has access to message
const hasMessageAccess = async (userId, messageId) => {
  const query = `
    SELECT jm.message_id 
    FROM journal_messages jm
    JOIN journals j ON jm.journal_id = j.journal_id
    WHERE jm.message_id = $1 AND (j.user_id = $2 OR j.partner_id = $2)
  `;
  
  const result = await db.query(query, [messageId, userId]);
  return result.rows.length > 0;
};

// Get media gallery
const getMediaGallery = async (journalId, type, limit, offset) => {
  let query = `
    SELECT 
      jm.message_id,
      jm.media_url,
      jm.media_metadata,
      jm.type,
      jm.created_at,
      u.username as sender_username
    FROM journal_messages jm
    JOIN users u ON jm.sender_id = u.id
    WHERE jm.journal_id = $1 AND jm.media_url IS NOT NULL
  `;
  
  const values = [journalId];
  
  if (type) {
    query += ` AND jm.type = $2`;
    values.push(type);
    query += ` ORDER BY jm.created_at DESC LIMIT $3 OFFSET $4`;
    values.push(limit, offset);
  } else {
    query += ` ORDER BY jm.created_at DESC LIMIT $2 OFFSET $3`;
    values.push(limit, offset);
  }
  
  const result = await db.query(query, values);
  return result.rows;
};

// Get message count for a journal
const getMessageCount = async (journalId) => {
  const query = `SELECT COUNT(*) as count FROM journal_messages WHERE journal_id = $1`;
  const result = await db.query(query, [journalId]);
  return parseInt(result.rows[0].count);
};

module.exports = {
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markAsRead,
  getMessageById,
  hasJournalAccess,
  hasMessageAccess,
  getMediaGallery,
  getMessageCount
};