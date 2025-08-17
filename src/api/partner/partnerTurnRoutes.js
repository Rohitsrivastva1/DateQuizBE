const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authmiddleware');
const { 
    startPartnerTurn, 
    submitPartnerAnswer, 
    getPartnerTurnReveal, 
    getUnreadPartnerTurns, 
    getPartnerDecks, 
    markTurnAsViewed, 
    getDeckQuestions,
    clearAllPartnerTurns 
} = require('./partnerTurnController');

router.use(protect);

router.post('/start', startPartnerTurn);
router.post('/answer', submitPartnerAnswer);
router.get('/unread', getUnreadPartnerTurns);
router.get('/reveal/:turnId', getPartnerTurnReveal);
router.get('/decks', getPartnerDecks);
router.post('/view/:turnId', markTurnAsViewed);
router.get('/decks/:deckId/questions', getDeckQuestions);
router.delete('/clear-all', protect, clearAllPartnerTurns);

module.exports = router; 