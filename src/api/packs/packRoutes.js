const express = require('express');

const {getAllPacks, getQuestionsByPackId} = require('./packController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

router.get('/', getAllPacks);

router.get('/:packId/questions',protect, getQuestionsByPackId);

module.exports = router;

