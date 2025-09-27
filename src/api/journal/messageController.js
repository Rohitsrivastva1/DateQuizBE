const messageQueries = require('../../services/db/messageQueries');
const { validationResult } = require('express-validator');

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { journalId } = req.params;
    const { type, content, mediaUrl, mediaMetadata, replyToMessageId } = req.body;

    // Check if user has access to this journal
    const hasAccess = await messageQueries.hasJournalAccess(req.user.id, journalId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to send messages to this journal' 
      });
    }

    // Create the message
    const message = await messageQueries.createMessage({
      journalId,
      senderId: req.user.id,
      type,
      content,
      mediaUrl,
      mediaMetadata,
      replyToMessageId
    });

    // Get the complete message with reactions
    const completeMessage = await messageQueries.getMessageById(message.messageId);

    // Broadcast the new message to all clients connected to this journal
    if (global.wsService) {
      global.wsService.broadcastToJournal(journalId, {
        type: 'new_message',
        data: completeMessage,
        journalId: journalId
      });
    }

    res.status(201).json({
      success: true,
      data: completeMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message' 
    });
  }
};

// Get messages for a journal
const getMessages = async (req, res) => {
  try {
    const { journalId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this journal
    const hasAccess = await messageQueries.hasJournalAccess(req.user.id, journalId);
    console.log(`User ${req.user.id} access to journal ${journalId}: ${hasAccess}`);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view messages in this journal' 
      });
    }

    const offset = (page - 1) * limit;
    console.log(`Getting messages for journal ${journalId}, limit: ${limit}, offset: ${offset}`);
    const messages = await messageQueries.getMessages(journalId, limit, offset);
    console.log(`Retrieved ${messages.length} messages`);
    const total = await messageQueries.getMessageCount(journalId);
    console.log(`Total messages in journal: ${total}`);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: offset + messages.length < total
        }
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get messages' 
    });
  }
};

// Update a message
const updateMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    // Check if user owns this message
    const message = await messageQueries.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    if (message.senderId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to edit this message' 
      });
    }

    const updatedMessage = await messageQueries.updateMessage(messageId, { content });

    res.json({
      success: true,
      data: updatedMessage
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update message' 
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Check if user owns this message
    const message = await messageQueries.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    if (message.senderId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this message' 
      });
    }

    await messageQueries.deleteMessage(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete message' 
    });
  }
};

// Add reaction to a message
const addReaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    // Check if user has access to this message
    const hasAccess = await messageQueries.hasMessageAccess(req.user.id, messageId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to react to this message' 
      });
    }

    const reaction = await messageQueries.addReaction(messageId, req.user.id, emoji);

    res.status(201).json({
      success: true,
      data: reaction
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add reaction' 
    });
  }
};

// Remove reaction from a message
const removeReaction = async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    // Check if user has access to this message
    const hasAccess = await messageQueries.hasMessageAccess(req.user.id, messageId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to remove reaction from this message' 
      });
    }

    const removed = await messageQueries.removeReaction(messageId, req.user.id, emoji);
    
    if (!removed) {
      return res.status(404).json({ 
        success: false, 
        error: 'Reaction not found' 
      });
    }

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove reaction' 
    });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Check if user has access to this message
    const hasAccess = await messageQueries.hasMessageAccess(req.user.id, messageId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to mark this message as read' 
      });
    }

    await messageQueries.markAsRead(messageId, req.user.id);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark message as read' 
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markAsRead
};
