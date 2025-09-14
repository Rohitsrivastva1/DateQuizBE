const express = require('express');

const {getAllPacks, getPackPreview, getQuestionsByPackId} = require('./packController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

// Public routes - no login required
router.get('/', getAllPacks);  // Show all packs with preview
router.get('/:packId/preview', getPackPreview); // Show 3 sample questions without login
router.get('/:packId/questions', protect, getQuestionsByPackId); // Require login for full questions

module.exports = router;

