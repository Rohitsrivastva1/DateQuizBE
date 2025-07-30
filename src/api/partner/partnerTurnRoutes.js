const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authmiddleware');
const { 
    startPartnerTurn, 
    submitPartnerAnswer, 
    getUnreadPartnerTurns, 
    getPartnerTurnReveal, 
    getPartnerDecks,
    markTurnAsViewed,
    getDeckQuestions
} = require('./partnerTurnController');

router.use(protect);

router.post('/start', startPartnerTurn);
router.post('/answer', submitPartnerAnswer);
router.get('/unread', getUnreadPartnerTurns);
router.get('/reveal/:turnId', getPartnerTurnReveal);
router.get('/decks', getPartnerDecks);
router.post('/view/:turnId', markTurnAsViewed);
router.get('/decks/:deckId/questions', getDeckQuestions);

module.exports = router; 