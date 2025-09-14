const partnerTurnQueries = require('../../services/db/partnerTurnQueries');
const packQueries = require('../../services/db/packQueries');
const db = require('../../config/db'); // Added db import

// Helper function to send SSE notifications
const sendSSENotification = (type, data) => {
    try {
        // Get the app instance to access SSE connections
        const { sendNotificationToAll } = require('../../../server');
        if (sendNotificationToAll) {
            sendNotificationToAll({
                type: type,
                timestamp: new Date().toISOString(),
                ...data
            });
        }
    } catch (error) {
        console.error('Error sending SSE notification:', error);
    }
};

// Start a new partner turn
const startPartnerTurn = async (req, res) => {
    const { deckId, questionId } = req.body;
    const userId = req.user.id;

    try {
        // Check if user has a partner
        const userPartner = await partnerTurnQueries.getUserPartner(userId);
        if (!userPartner) {
            return res.status(400).json({ 
                message: 'You need to have a partner to play partner mode' 
            });
        }

        // Check if question exists
        const question = await packQueries.findQuestionsByPackId(deckId);
        if (!question || question.length === 0) {
            return res.status(404).json({ 
                message: 'Question not found' 
            });
        }

        // Create new partner turn
        const partnerTurn = await partnerTurnQueries.createPartnerTurn(
            questionId, 
            deckId, 
            userId, 
            userPartner.partner_id
        );

        // Send SSE notification to partner
        sendSSENotification('partner_turn_update', {
            turnId: partnerTurn.id,
            questionId: questionId,
            deckId: deckId,
            partnerId: userPartner.partner_id,
            action: 'started'
        });

        res.status(201).json({
            message: 'Partner turn started successfully',
            turnId: partnerTurn.id,
            questionId: questionId,
            deckId: deckId
        });

    } catch (error) {
        console.error('Start partner turn error:', error);
        res.status(500).json({ 
            message: 'Failed to start partner turn' 
        });
    }
};

// Submit answer for partner turn
const submitPartnerAnswer = async (req, res) => {
    const { turnId, answer } = req.body;
    const userId = req.user.id;

    try {
        // Get the partner turn
        const partnerTurn = await partnerTurnQueries.getPartnerTurnById(turnId);
        if (!partnerTurn) {
            return res.status(404).json({ 
                message: 'Partner turn not found' 
            });
        }

        // Check if user is part of this turn
        if (partnerTurn.requester_id !== userId && partnerTurn.receiver_id !== userId) {
            return res.status(403).json({ 
                message: 'You are not authorized to answer this question' 
            });
        }

        // Update the answer
        const updatedTurn = await partnerTurnQueries.updatePartnerTurnAnswer(turnId, userId, answer);

        console.log('Updated turn data:', {
            id: updatedTurn.id,
            answers: updatedTurn.answers,
            answersType: typeof updatedTurn.answers,
            status: updatedTurn.status
        });

        // Check if both answers are complete
        // Safely handle the answers field
        let answers;
        try {
            answers = typeof updatedTurn.answers === 'string' 
                ? JSON.parse(updatedTurn.answers) 
                : updatedTurn.answers;
        } catch (parseError) {
            console.error('Error parsing answers in submitPartnerAnswer:', parseError);
            answers = {};
        }

        console.log('Parsed answers in submitPartnerAnswer:', answers);

        const isComplete = answers[partnerTurn.requester_id] && answers[partnerTurn.receiver_id];

        // Send SSE notification to partner
        const partnerId = partnerTurn.requester_id === userId ? partnerTurn.receiver_id : partnerTurn.requester_id;
        sendSSENotification('partner_turn_update', {
            turnId: turnId,
            questionId: partnerTurn.question_id,
            deckId: partnerTurn.deck_id,
            partnerId: partnerId,
            action: 'answered',
            isComplete: isComplete,
            questionText: partnerTurn.question_text,
            deckName: partnerTurn.deck_name
        });

        // Send general notification update
        sendSSENotification('notification', {
            count: await getNotificationCount(partnerId)
        });

        res.json({
            message: 'Answer submitted successfully',
            turnId: turnId,
            isComplete: isComplete,
            status: updatedTurn.status,
            questionText: partnerTurn.question_text,
            deckName: partnerTurn.deck_name,
            partnerId: partnerId
        });

    } catch (error) {
        console.error('Submit partner answer error:', error);
        res.status(500).json({ 
            message: 'Failed to submit answer' 
        });
    }
};

// Helper function to get notification count for a user
const getNotificationCount = async (userId) => {
    try {
        const unreadTurns = await partnerTurnQueries.getUnreadPartnerTurns(userId);
        return unreadTurns.length;
    } catch (error) {
        console.error('Error getting notification count:', error);
        return 0;
    }
};

// Get unread partner turns for notifications
const getUnreadPartnerTurns = async (req, res) => {
    const userId = req.user.id;

    try {
        // Use the original function with fixed query
        const unreadTurns = await partnerTurnQueries.getUnreadPartnerTurns(userId);
        
        console.log('Partner notifications for user', userId, ':', unreadTurns);
        
        const mappedTurns = unreadTurns.map(turn => {
            const isWaitingForMe = !turn.user_answer && turn.partner_answer;
            const isWaitingForPartner = turn.user_answer && !turn.partner_answer;
            
            console.log('Turn mapping:', {
                turnId: turn.turn_id,
                userAnswer: turn.user_answer,
                partnerAnswer: turn.partner_answer,
                isWaitingForMe,
                isWaitingForPartner
            });
            
            return {
                turnId: turn.turn_id,
                questionText: turn.question_text,
                status: turn.status,
                deckName: turn.deck_name,
                userAnswer: turn.user_answer,
                partnerAnswer: turn.partner_answer,
                isWaitingForMe, // User hasn't answered but partner has
                isWaitingForPartner // User has answered but partner hasn't
            };
        });
        
        res.json({
            turns: mappedTurns
        });

    } catch (error) {
        console.error('Get unread partner turns error:', error);
        res.status(500).json({ 
            message: 'Failed to get unread turns' 
        });
    }
};

// Get partner turn for reveal screen
const getPartnerTurnReveal = async (req, res) => {
    const { turnId } = req.params;
    const userId = req.user.id;

    try {
        const partnerTurn = await partnerTurnQueries.getPartnerTurnForReveal(turnId, userId);
        
        if (!partnerTurn) {
            return res.status(404).json({ 
                message: 'Partner turn not found' 
            });
        }

        console.log('Partner turn data:', {
            id: partnerTurn.id,
            requester_id: partnerTurn.requester_id,
            receiver_id: partnerTurn.receiver_id,
            answers: partnerTurn.answers,
            answersType: typeof partnerTurn.answers
        });

        // Safely parse the answers JSON
        let answers;
        try {
            answers = typeof partnerTurn.answers === 'string' 
                ? JSON.parse(partnerTurn.answers) 
                : partnerTurn.answers;
        } catch (parseError) {
            console.error('Error parsing answers JSON:', parseError);
            answers = {};
        }

        console.log('Parsed answers:', answers);

        const isRequester = partnerTurn.requester_id === userId;

        res.json({
            turnId: partnerTurn.id,
            questionText: partnerTurn.question_text,
            deckName: partnerTurn.deck_name,
            status: partnerTurn.status,
            answers: {
                yourAnswer: answers[userId]?.text || null,
                partnerAnswer: answers[isRequester ? partnerTurn.receiver_id : partnerTurn.requester_id]?.text || null,
                yourName: isRequester ? partnerTurn.requester_name : partnerTurn.receiver_name,
                partnerName: isRequester ? partnerTurn.receiver_name : partnerTurn.requester_name
            },
            timestamps: {
                yourTimestamp: answers[userId]?.timestamp || null,
                partnerTimestamp: answers[isRequester ? partnerTurn.receiver_id : partnerTurn.requester_id]?.timestamp || null
            }
        });

    } catch (error) {
        console.error('Get partner turn reveal error:', error);
        res.status(500).json({ 
            message: 'Failed to get partner turn reveal' 
        });
    }
};

// Mark turn as viewed
const markTurnAsViewed = async (req, res) => {
    const { turnId } = req.params;
    const userId = req.user.id;

    try {
        const result = await partnerTurnQueries.markTurnAsViewed(turnId, userId);
        
        if (!result) {
            return res.status(404).json({ 
                message: 'Turn not found' 
            });
        }

        res.json({
            message: 'Turn marked as viewed'
        });

    } catch (error) {
        console.error('Mark turn as viewed error:', error);
        res.status(500).json({ 
            message: 'Failed to mark turn as viewed' 
        });
    }
};

// Get questions for a specific deck
const getDeckQuestions = async (req, res) => {
    const { deckId } = req.params;

    console.log('GetDeckQuestions called with deckId:', deckId);

    try {
        const questions = await partnerTurnQueries.getDeckQuestions(deckId);
        
        console.log('Questions from database:', questions);
        
        if (questions.length === 0) {
            console.log('No questions found for deckId:', deckId);
            return res.status(404).json({ 
                message: 'No questions found for this deck' 
            });
        }

        const response = {
            deckId: parseInt(deckId),
            questions: questions.map(q => ({
                id: q.id,
                questionText: q.question_text,
                packId: q.pack_id
            }))
        };

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Get deck questions error:', error);
        res.status(500).json({ 
            message: 'Failed to get deck questions' 
        });
    }
};

// Get partner decks (decks that can be played with partner)
const getPartnerDecks = async (req, res) => {
    try {
        const partnerDecks = await partnerTurnQueries.getPartnerDecks();
        
        res.json({
            decks: partnerDecks
        });

    } catch (error) {
        console.error('Get partner decks error:', error);
        res.status(500).json({ 
            message: 'Failed to get partner decks' 
        });
    }
};

const clearAllPartnerTurns = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get all unread partner turns for this user
        const unreadTurns = await partnerTurnQueries.getUnreadPartnerTurns(userId);
        
        let clearedCount = 0;
        
        // For each unread turn, mark it as viewed by adding a "viewed" flag to the answers
        for (const turn of unreadTurns) {
            try {
                // Get the current turn data
                const currentTurn = await partnerTurnQueries.getPartnerTurnById(turn.turn_id);
                if (currentTurn) {
                    let answers = currentTurn.answers || {};
                    if (typeof answers === 'string') {
                        answers = JSON.parse(answers);
                    }
                    
                    // Add a viewed flag for this user
                    answers[`viewed_${userId}`] = {
                        viewed: true,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Update the turn with the viewed flag
                    await partnerTurnQueries.updatePartnerTurnAnswers(turn.turn_id, answers);
                    clearedCount++;
                }
            } catch (turnError) {
                console.error(`Error clearing turn ${turn.turn_id}:`, turnError);
            }
        }
        
        console.log(`Cleared ${clearedCount} partner turns for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'All partner turns cleared successfully',
            clearedCount: clearedCount
        });
    } catch (error) {
        console.error('Error clearing all partner turns:', error);
        res.status(500).json({ error: 'Failed to clear partner turns' });
    }
};

module.exports = {
    startPartnerTurn,
    submitPartnerAnswer,
    getUnreadPartnerTurns,
    getPartnerTurnReveal,
    getPartnerDecks,
    markTurnAsViewed,
    getDeckQuestions,
    clearAllPartnerTurns
}; 