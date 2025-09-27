const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const mediaController = require('./mediaController');
const fileStorage = require('../../services/fileStorage');
const { protect } = require('../../middleware/authmiddleware');

// Media upload route
router.post('/:journalId/upload',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    body('type').optional().isIn(['image', 'audio']).withMessage('Type must be either image or audio'),
    body('replyToMessageId').optional().isInt().withMessage('Reply to message ID must be an integer')
  ],
  fileStorage.upload.array('media', 5), // Allow up to 5 files
  mediaController.uploadMedia
);

// Get media gallery
router.get('/:journalId/gallery',
  protect,
  [
    param('journalId').isInt().withMessage('Journal ID must be an integer'),
    query('type').optional().isIn(['image', 'audio']).withMessage('Type must be either image or audio'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  mediaController.getMediaGallery
);

// Delete media
router.delete('/:messageId',
  protect,
  [
    param('messageId').isInt().withMessage('Message ID must be an integer')
  ],
  mediaController.deleteMedia
);

// Get media info
router.get('/:messageId/info',
  protect,
  [
    param('messageId').isInt().withMessage('Message ID must be an integer')
  ],
  mediaController.getMediaInfo
);

// Serve media files (public route for serving files)
router.get('/serve/:filename',
  [
    param('filename').isString().isLength({ min: 1, max: 255 }).withMessage('Filename must be a string between 1 and 255 characters')
  ],
  mediaController.serveMedia
);

module.exports = router;