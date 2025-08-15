const pool = require('../../config/db');

// Get today's question
const getTodaysQuestion = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Get today's question
        const questionQuery = `
            SELECT id, question_text, category, question_date
            FROM daily_questions 
            WHERE question_date = $1 AND is_active = true
        `;
        const questionResult = await pool.query(questionQuery, [today]);
        
        if (questionResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No question available for today' 
            });
        }

        const question = questionResult.rows[0];

        // Check if user has already answered
        const answerQuery = `
            SELECT answer_text, answered_at
            FROM user_daily_answers 
            WHERE user_id = $1 AND question_id = $2
        `;
        const answerResult = await pool.query(answerQuery, [userId, question.id]);
        const userAnswer = answerResult.rows[0];

        // Get partner info
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id,
                u.username as partner_username
            FROM partner_requests pr
            JOIN users u ON u.id = (
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END
            )
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        const partner = partnerResult.rows[0];

        // Check if partner has answered
        let partnerAnswer = null;
        if (partner) {
            const partnerAnswerQuery = `
                SELECT answer_text, answered_at
                FROM user_daily_answers 
                WHERE user_id = $1 AND question_id = $2
            `;
            const partnerAnswerResult = await pool.query(partnerAnswerQuery, [partner.partner_id, question.id]);
            partnerAnswer = partnerAnswerResult.rows[0];
        }

        // Get couple name
        let coupleName = null;
        if (partner) {
            const coupleNameQuery = `
                SELECT couple_name
                FROM couple_names 
                WHERE (user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1)
            `;
            const coupleNameResult = await pool.query(coupleNameQuery, [userId, partner.partner_id]);
            coupleName = coupleNameResult.rows[0]?.couple_name;
        }

        res.json({
            success: true,
            question: {
                id: question.id,
                text: question.question_text,
                category: question.category,
                date: question.question_date
            },
            userAnswer: userAnswer ? {
                text: userAnswer.answer_text,
                answeredAt: userAnswer.answered_at
            } : null,
            partnerAnswer: partnerAnswer ? {
                text: partnerAnswer.answer_text,
                answeredAt: partnerAnswer.answered_at
            } : null,
            partner: partner ? {
                id: partner.partner_id,
                username: partner.partner_username
            } : null,
            coupleName: coupleName,
            bothAnswered: userAnswer && partnerAnswer,
            canReveal: userAnswer && partnerAnswer
        });

    } catch (error) {
        console.error('Error getting today\'s question:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Submit answer to today's question
const submitAnswer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { answer } = req.body;

        if (!answer || !answer.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Answer is required' 
            });
        }

        const today = new Date().toISOString().split('T')[0];

        // Get today's question
        const questionQuery = `
            SELECT id FROM daily_questions 
            WHERE question_date = $1 AND is_active = true
        `;
        const questionResult = await pool.query(questionQuery, [today]);
        
        if (questionResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No question available for today' 
            });
        }

        const questionId = questionResult.rows[0].id;

        // Check if already answered
        const existingAnswerQuery = `
            SELECT id FROM user_daily_answers 
            WHERE user_id = $1 AND question_id = $2
        `;
        const existingAnswerResult = await pool.query(existingAnswerQuery, [userId, questionId]);
        
        if (existingAnswerResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already answered today\'s question' 
            });
        }

        // Insert answer
        const insertAnswerQuery = `
            INSERT INTO user_daily_answers (user_id, question_id, answer_text)
            VALUES ($1, $2, $3)
            RETURNING id, answered_at
        `;
        const insertResult = await pool.query(insertAnswerQuery, [userId, questionId, answer.trim()]);

        // Get partner info
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id,
                u.username as partner_username
            FROM partner_requests pr
            JOIN users u ON u.id = (
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END
            )
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        const partner = partnerResult.rows[0];

        // Check if partner has also answered
        let bothAnswered = false;
        if (partner) {
            const partnerAnswerQuery = `
                SELECT id FROM user_daily_answers 
                WHERE user_id = $1 AND question_id = $2
            `;
            const partnerAnswerResult = await pool.query(partnerAnswerQuery, [partner.partner_id, questionId]);
            bothAnswered = partnerAnswerResult.rows.length > 0;

            // Create notification for partner
            const notificationQuery = `
                INSERT INTO daily_notifications (user_id, notification_type, question_id, partner_id, message)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await pool.query(notificationQuery, [
                partner.partner_id,
                'partner_answered',
                questionId,
                userId,
                `${req.user.username} has answered today's question!`
            ]);

            // If both answered, create reveal notification and update streaks/love meter
            if (bothAnswered) {
                // Create reveal notification for both users
                const revealMessage = 'Both partners have answered! Tap to reveal your answers.';
                await pool.query(notificationQuery, [
                    userId,
                    'answers_revealed',
                    questionId,
                    partner.partner_id,
                    revealMessage
                ]);
                await pool.query(notificationQuery, [
                    partner.partner_id,
                    'answers_revealed',
                    questionId,
                    userId,
                    revealMessage
                ]);

                // Update streaks and love meter
                await updateStreaksAndLoveMeter(userId, partner.partner_id);
            }
        }

        res.json({
            success: true,
            message: 'Answer submitted successfully',
            answerId: insertResult.rows[0].id,
            answeredAt: insertResult.rows[0].answered_at,
            bothAnswered: bothAnswered
        });

    } catch (error) {
        console.error('Error submitting answer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update streaks and love meter
const updateStreaksAndLoveMeter = async (userId, partnerId) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Update streaks
        const streakQuery = `
            INSERT INTO user_streaks (user_id, partner_id, current_streak, longest_streak, last_answered_date)
            VALUES ($1, $2, 1, 1, $3)
            ON CONFLICT (user_id, partner_id) 
            DO UPDATE SET 
                current_streak = CASE 
                    WHEN user_streaks.last_answered_date = $3 - INTERVAL '1 day' 
                    THEN user_streaks.current_streak + 1 
                    ELSE 1 
                END,
                longest_streak = CASE 
                    WHEN user_streaks.last_answered_date = $3 - INTERVAL '1 day' 
                    THEN GREATEST(user_streaks.longest_streak, user_streaks.current_streak + 1)
                    ELSE GREATEST(user_streaks.longest_streak, 1)
                END,
                last_answered_date = $3
        `;
        await pool.query(streakQuery, [userId, partnerId, today]);
        await pool.query(streakQuery, [partnerId, userId, today]);

        // Update love meter
        const loveMeterQuery = `
            INSERT INTO love_meters (user_id, partner_id, current_level, total_points, questions_answered_together)
            VALUES ($1, $2, 1, 10, 1)
            ON CONFLICT (user_id, partner_id) 
            DO UPDATE SET 
                total_points = love_meters.total_points + 10,
                questions_answered_together = love_meters.questions_answered_together + 1,
                current_level = (love_meters.total_points + 10) / 100 + 1
        `;
        await pool.query(loveMeterQuery, [userId, partnerId]);
        await pool.query(loveMeterQuery, [partnerId, userId]);

        // Check for milestones
        const milestoneQuery = `
            SELECT current_streak, longest_streak, total_points, questions_answered_together
            FROM user_streaks us
            LEFT JOIN love_meters lm ON us.user_id = lm.user_id AND us.partner_id = lm.partner_id
            WHERE us.user_id = $1 AND us.partner_id = $2
        `;
        const milestoneResult = await pool.query(milestoneQuery, [userId, partnerId]);
        const stats = milestoneResult.rows[0];

        // Check streak milestones
        const streakMilestones = [7, 30, 100];
        if (streakMilestones.includes(stats.current_streak)) {
            const milestoneMessage = `🎉 Amazing! You've reached a ${stats.current_streak}-day streak!`;
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, partner_id, message)
                VALUES ($1, $2, $3, $4)
            `, [userId, 'streak_milestone', partnerId, milestoneMessage]);
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, partner_id, message)
                VALUES ($1, $2, $3, $4)
            `, [partnerId, 'streak_milestone', userId, milestoneMessage]);
        }

        // Check love meter milestones
        const loveMeterMilestones = [50, 100, 200, 500];
        if (loveMeterMilestones.includes(stats.total_points)) {
            const milestoneMessage = `💕 Your love meter reached ${stats.total_points} points!`;
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, partner_id, message)
                VALUES ($1, $2, $3, $4)
            `, [userId, 'love_meter_milestone', partnerId, milestoneMessage]);
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, partner_id, message)
                VALUES ($1, $2, $3, $4)
            `, [partnerId, 'love_meter_milestone', userId, milestoneMessage]);
        }

    } catch (error) {
        console.error('Error updating streaks and love meter:', error);
    }
};

// Get user stats (streaks and love meter)
const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get partner info
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id,
                u.username as partner_username
            FROM partner_requests pr
            JOIN users u ON u.id = (
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END
            )
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        
        if (partnerResult.rows.length === 0) {
            return res.json({
                success: true,
                hasPartner: false,
                stats: null
            });
        }

        const partner = partnerResult.rows[0];

        // Get streaks and love meter
        const statsQuery = `
            SELECT 
                us.current_streak,
                us.longest_streak,
                lm.total_points,
                lm.current_level,
                lm.questions_answered_together
            FROM user_streaks us
            LEFT JOIN love_meters lm ON us.user_id = lm.user_id AND us.partner_id = lm.partner_id
            WHERE us.user_id = $1 AND us.partner_id = $2
        `;
        const statsResult = await pool.query(statsQuery, [userId, partner.partner_id]);
        
        const stats = statsResult.rows[0] || {
            current_streak: 0,
            longest_streak: 0,
            total_points: 0,
            current_level: 0,
            questions_answered_together: 0
        };

        // Get couple name
        const coupleNameQuery = `
            SELECT couple_name
            FROM couple_names 
            WHERE (user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1)
        `;
        const coupleNameResult = await pool.query(coupleNameQuery, [userId, partner.partner_id]);
        const coupleName = coupleNameResult.rows[0]?.couple_name;

        res.json({
            success: true,
            hasPartner: true,
            partner: {
                id: partner.partner_id,
                username: partner.partner_username
            },
            coupleName: coupleName,
            stats: {
                currentStreak: stats.current_streak,
                longestStreak: stats.longest_streak,
                totalPoints: stats.total_points,
                currentLevel: stats.current_level,
                questionsAnsweredTogether: stats.questions_answered_together,
                loveMeterPercentage: Math.min((stats.total_points % 100), 100)
            }
        });

    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Set couple name
const setCoupleName = async (req, res) => {
    try {
        const userId = req.user.id;
        const { coupleName } = req.body;

        if (!coupleName || !coupleName.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Couple name is required' 
            });
        }

        // Get partner info
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id
            FROM partner_requests pr
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        
        if (partnerResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'You need to have a partner to set a couple name' 
            });
        }

        const partnerId = partnerResult.rows[0].partner_id;

        // Insert or update couple name
        const coupleNameQuery = `
            INSERT INTO couple_names (user_id, partner_id, couple_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, partner_id) 
            DO UPDATE SET couple_name = $3, updated_at = CURRENT_TIMESTAMP
        `;
        await pool.query(coupleNameQuery, [userId, partnerId, coupleName.trim()]);

        res.json({
            success: true,
            message: 'Couple name set successfully',
            coupleName: coupleName.trim()
        });

    } catch (error) {
        console.error('Error setting couple name:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get daily notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const notificationsQuery = `
            SELECT id, notification_type, message, is_read, created_at
            FROM daily_notifications 
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const notificationsResult = await pool.query(notificationsQuery, [userId]);

        res.json({
            success: true,
            notifications: notificationsResult.rows
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const updateQuery = `
            UPDATE daily_notifications 
            SET is_read = true
            WHERE id = $1 AND user_id = $2
        `;
        const result = await pool.query(updateQuery, [notificationId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notification not found' 
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get question history
const getQuestionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const historyQuery = `
            SELECT 
                dq.question_text,
                dq.category,
                dq.question_date,
                uda.answer_text as user_answer,
                uda.answered_at,
                pda.answer_text as partner_answer,
                pda.answered_at as partner_answered_at
            FROM daily_questions dq
            LEFT JOIN user_daily_answers uda ON dq.id = uda.question_id AND uda.user_id = $1
            LEFT JOIN user_daily_answers pda ON dq.id = pda.question_id AND pda.user_id = (
                SELECT partner_id FROM partner_requests WHERE user_id = $1 AND status = 'approved'
            )
            WHERE dq.question_date <= CURRENT_DATE
            ORDER BY dq.question_date DESC
            LIMIT $2 OFFSET $3
        `;
        const historyResult = await pool.query(historyQuery, [userId, limit, offset]);

        res.json({
            success: true,
            history: historyResult.rows,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error getting question history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    getTodaysQuestion,
    submitAnswer,
    getUserStats,
    setCoupleName,
    getNotifications,
    markNotificationRead,
    getQuestionHistory
};
