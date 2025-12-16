const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const journalController = require('./journalController');
const messageController = require('./messageController');
const { protect } = require('../../middleware/authmiddleware');
const { commonRules, handleValidationErrors, validateFileUpload } = require('../../middleware/inputValidation');

// Journal routes
// Normalize client payloads that send fields under body.data
const normalizeJournalBody = (req, res, next) => {
  try {
    if (req.body && req.body.data && typeof req.body.data === 'object') {
      Object.assign(req.body, req.body.data);
      delete req.body.data;
    }
  } catch (_) {}
  next();
};

router.post('/:coupleId/date/:date', 
  protect,
  normalizeJournalBody,
  [
    param('coupleId').isInt({ min: 1 }).withMessage('Couple ID must be a positive integer'),
    param('date').custom(value => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      const date = new Date(value + 'T00:00:00.000Z');
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return true;
    }),
    ...commonRules.journalContent
  ],
  handleValidationErrors,
  journalController.createOrGetJournal
);

router.get('/:coupleId/date/:date',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer'),
    param('date').isISO8601().withMessage('Date must be in ISO 8601 format')
  ],
  journalController.getJournalByDate
);

router.get('/:coupleId/calendar/:year/:month',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer'),
    param('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
    param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
  ],
  journalController.getCalendarData
);

router.put('/:coupleId/date/:date',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer'),
    param('date').isISO8601().withMessage('Date must be in ISO 8601 format'),
    body('theme').optional().isString().isLength({ max: 50 }).withMessage('Theme must be a string with max 50 characters'),
    body('pinnedMessageId').optional().isInt().withMessage('Pinned message ID must be an integer'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
    body('unlockDate').optional().isISO8601().withMessage('Unlock date must be in ISO 8601 format')
  ],
  journalController.updateJournal
);

router.delete('/:coupleId/date/:date',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer'),
    param('date').isISO8601().withMessage('Date must be in ISO 8601 format')
  ],
  journalController.deleteJournal
);

router.get('/:coupleId/stats',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer')
  ],
  journalController.getJournalStats
);

// Journal timeline route
router.get('/:coupleId/timeline',
  protect,
  [
    param('coupleId').isInt().withMessage('Couple ID must be an integer')
  ],
  journalController.getJournalTimeline
);

// Message routes
router.post('/:journalId/messages',
  protect,
  [
    param('journalId').isInt({ min: 1 }).withMessage('Journal ID must be a positive integer'),
    ...commonRules.messageContent
  ],
  handleValidationErrors,
  messageController.sendMessage
);

router.get('/:journalId/messages',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  messageController.getMessages
);

router.put('/:journalId/messages/:messageId',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    param('messageId').isInt().withMessage('Message ID must be an integer'),
    body('content').isString().isLength({ min: 1, max: 2000 }).withMessage('Content must be a string between 1 and 2000 characters')
  ],
  messageController.updateMessage
);

router.delete('/:journalId/messages/:messageId',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    param('messageId').isInt().withMessage('Message ID must be an integer')
  ],
  messageController.deleteMessage
);

// Reaction routes
router.post('/:journalId/messages/:messageId/reactions',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    param('messageId').isInt().withMessage('Message ID must be an integer'),
    body('emoji').isString().isLength({ min: 1, max: 10 }).withMessage('Emoji must be a string between 1 and 10 characters')
  ],
  messageController.addReaction
);

router.delete('/:journalId/messages/:messageId/reactions/:emoji',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    param('messageId').isInt().withMessage('Message ID must be an integer'),
    param('emoji').isString().isLength({ min: 1, max: 10 }).withMessage('Emoji must be a string between 1 and 10 characters')
  ],
  messageController.removeReaction
);

// Read status routes
router.post('/:journalId/messages/:messageId/read',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    param('messageId').isInt().withMessage('Message ID must be an integer')
  ],
  messageController.markAsRead
);

module.exports = router;