const db = require('../../config/db');

// Create a new partner turn question
const createPartnerTurn = async (questionId, deckId, requesterId, receiverId) => {
    const query = `
        INSERT INTO partner_turn_questions 
        (question_id, deck_id, requester_id, receiver_id, status, answers, notifications_sent, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, 'waiting_receiver', $5, $6, NOW(), NOW()) 
        RETURNING *
    `;
    
    const answers = JSON.stringify({
        [requesterId.toString()]: null,
        [receiverId.toString()]: null
    });
    
    const notificationsSent = JSON.stringify({
        [requesterId.toString()]: false,
        [receiverId.toString()]: false
    });
    
    const values = [questionId, deckId, requesterId, receiverId, answers, notificationsSent];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Get partner turn by ID
const getPartnerTurnById = async (turnId) => {
    const query = `
        SELECT ptq.*, q.question_text, p.title as deck_name 
        FROM partner_turn_questions ptq
        JOIN questions q ON ptq.question_id = q.id
        JOIN packs p ON ptq.deck_id = p.id
        WHERE ptq.id = $1
    `;
    const { rows } = await db.query(query, [turnId]);
    return rows[0];
};

// Update partner turn answer
const updatePartnerTurnAnswer = async (turnId, userId, answer) => {
    // First, get the current turn data to determine if user is requester or receiver
    const currentTurn = await getPartnerTurnById(turnId);
    if (!currentTurn) {
        throw new Error('Turn not found');
    }

    console.log('Updating answer for turn:', turnId, 'user:', userId, 'answer:', answer);
    console.log('Current turn data:', currentTurn);

    const userKey = userId.toString();
    const answerValue = JSON.stringify({ text: answer, timestamp: new Date().toISOString() });

    // Use a simpler approach - get current answers, update them, then save
    let currentAnswers = currentTurn.answers || {};
    if (typeof currentAnswers === 'string') {
        try {
            currentAnswers = JSON.parse(currentAnswers);
        } catch (e) {
            currentAnswers = {};
        }
    }
    
    // Update the answers object
    currentAnswers[userKey] = { text: answer, timestamp: new Date().toISOString() };
    
    // Check if both answers are complete
    const requesterKey = currentTurn.requester_id.toString();
    const receiverKey = currentTurn.receiver_id.toString();
    const isComplete = currentAnswers[requesterKey] && currentAnswers[receiverKey];
    
    const query = `
        UPDATE partner_turn_questions 
        SET 
            answers = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
    `;
    
    console.log('Updated answers object:', currentAnswers);
    console.log('Is complete:', isComplete);
    
    const values = [JSON.stringify(currentAnswers), isComplete ? 'complete' : currentTurn.status, turnId];
    const result = await db.query(query, values);
    
    console.log('Update result:', result.rows[0]);
    return result.rows[0];
};

// Get unread partner turns for a user
const getUnreadPartnerTurns = async (userId) => {
    // First, get all partner turns for this user
    const query = `
        SELECT 
            ptq.id as turn_id,
            q.question_text,
            ptq.status,
            ptq.requester_id,
            ptq.receiver_id,
            p.title as deck_name,
            u1.username as requester_name,
            u2.username as receiver_name,
            ptq.answers
        FROM partner_turn_questions ptq
        JOIN questions q ON ptq.question_id = q.id
        JOIN packs p ON ptq.deck_id = p.id
        JOIN users u1 ON ptq.requester_id = u1.id
        JOIN users u2 ON ptq.receiver_id = u2.id
        WHERE (ptq.requester_id = $1 OR ptq.receiver_id = $1)
        AND ptq.status != 'complete'
        ORDER BY ptq.created_at DESC
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    // Filter and process the results in JavaScript
    const unreadTurns = rows.filter(turn => {
        const answers = typeof turn.answers === 'string' ? JSON.parse(turn.answers) : turn.answers;
        const userAnswer = answers[userId.toString()];
        const partnerId = turn.requester_id === userId ? turn.receiver_id : turn.requester_id;
        const partnerAnswer = answers[partnerId.toString()];
        
        // Show if partner has answered but user hasn't
        return !userAnswer && partnerAnswer;
    }).map(turn => {
        const answers = typeof turn.answers === 'string' ? JSON.parse(turn.answers) : turn.answers;
        const userAnswer = answers[userId.toString()];
        const partnerId = turn.requester_id === userId ? turn.receiver_id : turn.requester_id;
        const partnerAnswer = answers[partnerId.toString()];
        
        return {
            turn_id: turn.turn_id,
            question_text: turn.question_text,
            status: turn.status,
            requester_id: turn.requester_id,
            receiver_id: turn.receiver_id,
            deck_name: turn.deck_name,
            requester_name: turn.requester_name,
            receiver_name: turn.receiver_name,
            user_answer: userAnswer?.text || null,
            partner_answer: partnerAnswer?.text || null
        };
    });
    
    console.log('Unread turns for user', userId, ':', unreadTurns);
    return unreadTurns;
};

// Get partner turns for reveal screen
const getPartnerTurnForReveal = async (turnId, userId) => {
    const query = `
        SELECT 
            ptq.*,
            q.question_text,
            p.title as deck_name,
            u1.username as requester_name,
            u2.username as receiver_name
        FROM partner_turn_questions ptq
        JOIN questions q ON ptq.question_id = q.id
        JOIN packs p ON ptq.deck_id = p.id
        JOIN users u1 ON ptq.requester_id = u1.id
        JOIN users u2 ON ptq.receiver_id = u2.id
        WHERE ptq.id = $1 AND (ptq.requester_id = $2 OR ptq.receiver_id = $2)
    `;
    const { rows } = await db.query(query, [turnId, userId]);
    return rows[0];
};

// Check if user has a partner
const getUserPartner = async (userId) => {
    const query = `
        SELECT partner_id, username as partner_name 
        FROM users 
        WHERE id = $1 AND partner_id IS NOT NULL
    `;
    const { rows } = await db.query(query, [userId]);
    return rows[0];
};

// Get questions for a specific deck
const getDeckQuestions = async (deckId) => {
    const query = `
        SELECT 
            id,
            question_text,
            pack_id
        FROM questions 
        WHERE pack_id = $1
        ORDER BY id
    `;
    const { rows } = await db.query(query, [deckId]);
    return rows;
};

// Mark turn as viewed by user
const markTurnAsViewed = async (turnId, userId) => {
    const query = `
        UPDATE partner_turn_questions 
        SET notifications_sent = jsonb_set(notifications_sent, $1, 'true')
        WHERE id = $2
        RETURNING *
    `;
    
    const userKey = `{${userId.toString()}}`;
    const values = [userKey, turnId];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Get partner decks (decks that can be played with partner)
const getPartnerDecks = async () => {
    const query = `
        SELECT id, title, description, emoji, category, is_premium 
        FROM packs 
        WHERE category = 'couple' OR title ILIKE '%partner%'
        ORDER BY id
    `;
    const { rows } = await db.query(query);
    return rows.map(pack => ({ ...pack, isPremium: pack.is_premium === 'true' }));
};

module.exports = {
    createPartnerTurn,
    getPartnerTurnById,
    updatePartnerTurnAnswer,
    getUnreadPartnerTurns,
    getPartnerTurnForReveal,
    getUserPartner,
    getPartnerDecks,
    markTurnAsViewed,
    getDeckQuestions
};