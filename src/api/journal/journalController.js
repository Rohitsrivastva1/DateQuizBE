const journalQueries = require('../../services/db/journalQueries');
const { validationResult } = require('express-validator');

// Create or get journal entry for a specific date
const createOrGetJournal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { coupleId, date } = req.params;
    const { theme, isPrivate, unlockDate } = req.body;

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this journal' 
      });
    }

    // Try to get existing journal
    let journal = await journalQueries.getJournalByDate(req.user.id, date);
    
    if (!journal) {
      // Create new journal
      journal = await journalQueries.createJournal({
        userId: req.user.id,
        partnerId: coupleId,
        date,
        theme: theme || 'default',
        isPrivate: isPrivate || false,
        unlockDate
      });
    }

    res.json({
      success: true,
      data: journal
    });
  } catch (error) {
    console.error('Error creating/getting journal:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create/get journal',
      details: error.message
    });
  }
};

// Get journal entry by date
const getJournalByDate = async (req, res) => {
  try {
    const { coupleId, date } = req.params;

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this journal' 
      });
    }

    const journal = await journalQueries.getJournalByDate(req.user.id, date);
    
    if (!journal) {
      return res.status(404).json({ 
        success: false, 
        error: 'Journal not found' 
      });
    }

    res.json({
      success: true,
      data: journal
    });
  } catch (error) {
    console.error('Error getting journal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get journal' 
    });
  }
};

// Get calendar data for a month
const getCalendarData = async (req, res) => {
  try {
    const { coupleId, year, month } = req.params;

    // Check if user has a partner
    if (!req.user.partner_id) {
      return res.json({
        success: true,
        data: {
          year: parseInt(year),
          month: parseInt(month),
          days: []
        },
        message: 'No partner connected yet'
      });
    }

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this calendar' 
      });
    }

    const calendarData = await journalQueries.getCalendarData(req.user.id, year, month);

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        days: calendarData
      }
    });
  } catch (error) {
    console.error('Error getting calendar data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get calendar data' 
    });
  }
};

// Update journal entry
const updateJournal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { coupleId, date } = req.params;
    const { theme, pinnedMessageId, isPrivate, unlockDate } = req.body;

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this journal' 
      });
    }

    const journal = await journalQueries.updateJournal(coupleId, date, {
      theme,
      pinnedMessageId,
      isPrivate,
      unlockDate
    });

    if (!journal) {
      return res.status(404).json({ 
        success: false, 
        error: 'Journal not found' 
      });
    }

    res.json({
      success: true,
      data: journal
    });
  } catch (error) {
    console.error('Error updating journal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update journal' 
    });
  }
};

// Delete journal entry
const deleteJournal = async (req, res) => {
  try {
    const { coupleId, date } = req.params;

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this journal' 
      });
    }

    const deleted = await journalQueries.deleteJournal(coupleId, date);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Journal not found' 
      });
    }

    res.json({
      success: true,
      message: 'Journal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting journal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete journal' 
    });
  }
};

// Get journal statistics
const getJournalStats = async (req, res) => {
  try {
    const { coupleId } = req.params;

    // Check if user has a partner
    if (!req.user.partner_id) {
      return res.json({
        success: true,
        data: {
          totalEntries: 0,
          totalMessages: 0,
          thisMonthEntries: 0
        },
        message: 'No partner connected yet'
      });
    }

    // Check if user is part of the couple
    const isAuthorized = await journalQueries.isUserInCouple(req.user.id, coupleId);
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this journal' 
      });
    }

    const stats = await journalQueries.getJournalStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting journal stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get journal statistics' 
    });
  }
};

// Get journal timeline for a couple
const getJournalTimeline = async (req, res) => {
  try {
    const { coupleId } = req.params;

    // Check if user has a partner
    if (!req.user.partner_id) {
      return res.json({
        success: true,
        data: [],
        message: 'No partner connected yet'
      });
    }

    // Check if user has access to this couple's journals
    if (req.user.partner_id !== parseInt(coupleId)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this timeline' 
      });
    }

    // Get timeline for the couple (use user_id to get both users' journals)
    const timeline = await journalQueries.getJournalTimeline(req.user.id);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Error getting journal timeline:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get journal timeline' 
    });
  }
};

module.exports = {
  createOrGetJournal,
  getJournalByDate,
  getCalendarData,
  updateJournal,
  deleteJournal,
  getJournalStats,
  getJournalTimeline
};
