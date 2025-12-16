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
                INSERT INTO daily_notifications (user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4)
            `;
            await pool.query(notificationQuery, [
                partner.partner_id,
                'partner_answered',
                'Partner Answered Question',
                `${req.user.username} has answered today's question!`
            ]);

            // If both answered, create reveal notification and update streaks/love meter
            if (bothAnswered) {
                // Create reveal notification for both users
                const revealMessage = 'Both partners have answered! Tap to reveal your answers.';
                await pool.query(`
                    INSERT INTO daily_notifications (user_id, notification_type, title, message)
                    VALUES ($1, $2, $3, $4)
                `, [
                    userId,
                    'answers_revealed',
                    'Answers Revealed!',
                    revealMessage
                ]);
                await pool.query(`
                    INSERT INTO daily_notifications (user_id, notification_type, title, message)
                    VALUES ($1, $2, $3, $4)
                `, [
                    partner.partner_id,
                    'answers_revealed',
                    'Answers Revealed!',
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
            INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_answered_date)
            VALUES ($1, 1, 1, $2)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                current_streak = CASE 
                    WHEN user_streaks.last_answered_date = $2 - INTERVAL '1 day' 
                    THEN user_streaks.current_streak + 1 
                    ELSE 1 
                END,
                longest_streak = CASE 
                    WHEN user_streaks.last_answered_date = $2 - INTERVAL '1 day' 
                    THEN GREATEST(user_streaks.longest_streak, user_streaks.current_streak + 1)
                    ELSE GREATEST(user_streaks.longest_streak, 1)
                END,
                last_answered_date = $2
        `;
        await pool.query(streakQuery, [userId, today]);
        await pool.query(streakQuery, [partnerId, today]);

        // Update love meter
        const loveMeterQuery = `
            INSERT INTO love_meters (user_id, partner_id, love_score, questions_answered)
            VALUES ($1, $2, 10, 1)
            ON CONFLICT (user_id, partner_id) 
            DO UPDATE SET 
                love_score = love_meters.love_score + 10,
                questions_answered = love_meters.questions_answered + 1
        `;
        await pool.query(loveMeterQuery, [userId, partnerId]);
        await pool.query(loveMeterQuery, [partnerId, userId]);

        // Check for milestones
        const milestoneQuery = `
            SELECT us.current_streak, us.longest_streak, lm.love_score, lm.questions_answered
            FROM user_streaks us
            LEFT JOIN love_meters lm ON us.user_id = lm.user_id AND lm.partner_id = $2
            WHERE us.user_id = $1
        `;
        const milestoneResult = await pool.query(milestoneQuery, [userId, partnerId]);
        const stats = milestoneResult.rows[0];

        // Check streak milestones
        const streakMilestones = [7, 30, 100];
        if (streakMilestones.includes(stats.current_streak)) {
            const milestoneMessage = `🎉 Amazing! You've reached a ${stats.current_streak}-day streak!`;
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4)
            `, [userId, 'streak_milestone', 'Streak Milestone!', milestoneMessage]);
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4)
            `, [partnerId, 'streak_milestone', 'Streak Milestone!', milestoneMessage]);
        }

        // Check love meter milestones
        const loveMeterMilestones = [50, 100, 200, 500];
        if (loveMeterMilestones.includes(stats.love_score)) {
            const milestoneMessage = `💕 Your love meter reached ${stats.love_score} points!`;
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4)
            `, [userId, 'love_meter_milestone', 'Love Meter Milestone!', milestoneMessage]);
            await pool.query(`
                INSERT INTO daily_notifications (user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4)
            `, [partnerId, 'love_meter_milestone', 'Love Meter Milestone!', milestoneMessage]);
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

// Get couple name
const getCoupleName = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get partner info first
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
            return res.status(404).json({ 
                success: false, 
                message: 'No partner found' 
            });
        }

        const partnerId = partnerResult.rows[0].partner_id;

        // Get couple name from couple_names table
        const coupleQuery = `
            SELECT couple_name
            FROM couple_names
            WHERE (user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1)
        `;
        const coupleResult = await pool.query(coupleQuery, [userId, partnerId]);
        
        const coupleName = coupleResult.rows.length > 0 ? coupleResult.rows[0].couple_name : null;

        res.json({
            success: true,
            coupleName: coupleName
        });
    } catch (error) {
        console.error('Error getting couple name:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get couple name' 
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

// Get question history with improved partner lookup
const getQuestionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Get partner ID first
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id
            FROM partner_requests pr
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
            LIMIT 1
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        const partnerId = partnerResult.rows[0]?.partner_id || null;

        const historyQuery = `
            SELECT 
                dq.id as question_id,
                dq.question_text,
                dq.category,
                dq.question_date,
                uda.answer_text as user_answer,
                uda.answered_at,
                ${partnerId ? `pda.answer_text as partner_answer,
                pda.answered_at as partner_answered_at,` : `NULL as partner_answer,
                NULL as partner_answered_at,`}
                CASE 
                    WHEN uda.id IS NOT NULL AND ${partnerId ? 'pda.id IS NOT NULL' : 'FALSE'} THEN true
                    ELSE false
                END as both_answered
            FROM daily_questions dq
            LEFT JOIN user_daily_answers uda ON dq.id = uda.question_id AND uda.user_id = $1
            ${partnerId ? `LEFT JOIN user_daily_answers pda ON dq.id = pda.question_id AND pda.user_id = $2` : ''}
            WHERE dq.question_date <= CURRENT_DATE AND dq.is_active = true
            ORDER BY dq.question_date DESC
            LIMIT $${partnerId ? '3' : '2'} OFFSET $${partnerId ? '4' : '3'}
        `;
        
        const queryParams = partnerId ? [userId, partnerId, limit, offset] : [userId, limit, offset];
        const historyResult = await pool.query(historyQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM daily_questions dq
            WHERE dq.question_date <= CURRENT_DATE AND dq.is_active = true
        `;
        const countResult = await pool.query(countQuery);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            history: historyResult.rows.map(row => ({
                questionId: row.question_id,
                text: row.question_text,
                category: row.category,
                date: row.question_date,
                userAnswer: row.user_answer ? {
                    text: row.user_answer,
                    answeredAt: row.answered_at
                } : null,
                partnerAnswer: row.partner_answer ? {
                    text: row.partner_answer,
                    answeredAt: row.partner_answered_at
                } : null,
                bothAnswered: row.both_answered
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error getting question history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get partner answer comparison for a specific question
const getPartnerAnswerComparison = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.params;

        // Get partner ID
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
            LIMIT 1
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        
        if (partnerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No partner found'
            });
        }

        const partner = partnerResult.rows[0];

        // Get question and both answers
        const comparisonQuery = `
            SELECT 
                dq.id as question_id,
                dq.question_text,
                dq.category,
                dq.question_date,
                u.username as user_username,
                ua.answer_text as user_answer,
                ua.answered_at as user_answered_at,
                pa.answer_text as partner_answer,
                pa.answered_at as partner_answered_at,
                EXTRACT(EPOCH FROM (pa.answered_at - ua.answered_at)) as time_difference_seconds
            FROM daily_questions dq
            LEFT JOIN user_daily_answers ua ON dq.id = ua.question_id AND ua.user_id = $1
            LEFT JOIN user_daily_answers pa ON dq.id = pa.question_id AND pa.user_id = $2
            LEFT JOIN users u ON u.id = $1
            WHERE dq.id = $3
        `;
        const comparisonResult = await pool.query(comparisonQuery, [userId, partner.partner_id, questionId]);

        if (comparisonResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        const data = comparisonResult.rows[0];

        res.json({
            success: true,
            question: {
                id: data.question_id,
                text: data.question_text,
                category: data.category,
                date: data.question_date
            },
            answers: {
                user: {
                    username: data.user_username,
                    answer: data.user_answer,
                    answeredAt: data.user_answered_at
                },
                partner: {
                    username: partner.partner_username,
                    answer: data.partner_answer,
                    answeredAt: data.partner_answered_at
                },
                timeDifference: data.time_difference_seconds ? {
                    seconds: Math.abs(data.time_difference_seconds),
                    minutes: Math.abs(Math.floor(data.time_difference_seconds / 60)),
                    hours: Math.abs(Math.floor(data.time_difference_seconds / 3600)),
                    answeredFirst: data.time_difference_seconds > 0 ? 'partner' : 'user'
                } : null,
                bothAnswered: data.user_answer !== null && data.partner_answer !== null
            }
        });

    } catch (error) {
        console.error('Error getting partner answer comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get analytics for daily questions
const getDailyQuestionsAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query; // Default to last 30 days

        // Get partner ID
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id
            FROM partner_requests pr
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
            LIMIT 1
        `;
        const partnerResult = await pool.query(partnerQuery, [userId]);
        const partnerId = partnerResult.rows[0]?.partner_id || null;

        // Overall statistics
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT dq.id) as total_questions,
                COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL THEN dq.id END) as user_answered,
                COUNT(DISTINCT CASE WHEN ${partnerId ? 'pa.id IS NOT NULL' : 'FALSE'} THEN dq.id END) as partner_answered,
                COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL AND ${partnerId ? 'pa.id IS NOT NULL' : 'FALSE'} THEN dq.id END) as both_answered,
                AVG(CASE WHEN ua.answered_at IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as user_answer_rate,
                AVG(CASE WHEN ${partnerId ? 'pa.answered_at IS NOT NULL' : 'FALSE'} THEN 1.0 ELSE 0.0 END) * 100 as partner_answer_rate
            FROM daily_questions dq
            LEFT JOIN user_daily_answers ua ON dq.id = ua.question_id AND ua.user_id = $1
            ${partnerId ? `LEFT JOIN user_daily_answers pa ON dq.id = pa.question_id AND pa.user_id = $2` : ''}
            WHERE dq.question_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
                AND dq.question_date <= CURRENT_DATE
                AND dq.is_active = true
        `;
        
        const statsParams = partnerId ? [userId, partnerId] : [userId];
        const statsResult = await pool.query(statsQuery, statsParams);
        const stats = statsResult.rows[0];

        // Category breakdown
        const categoryQuery = `
            SELECT 
                dq.category,
                COUNT(DISTINCT dq.id) as total_questions,
                COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL THEN dq.id END) as answered_count
            FROM daily_questions dq
            LEFT JOIN user_daily_answers ua ON dq.id = ua.question_id AND ua.user_id = $1
            WHERE dq.question_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
                AND dq.question_date <= CURRENT_DATE
                AND dq.is_active = true
            GROUP BY dq.category
            ORDER BY answered_count DESC
        `;
        const categoryResult = await pool.query(categoryQuery, [userId]);

        // Daily activity (last 7 days)
        const dailyActivityQuery = `
            SELECT 
                DATE(dq.question_date) as date,
                COUNT(DISTINCT dq.id) as questions_available,
                COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL THEN dq.id END) as user_answered,
                COUNT(DISTINCT CASE WHEN ${partnerId ? 'pa.id IS NOT NULL' : 'FALSE'} THEN dq.id END) as partner_answered
            FROM daily_questions dq
            LEFT JOIN user_daily_answers ua ON dq.id = ua.question_id AND ua.user_id = $1
            ${partnerId ? `LEFT JOIN user_daily_answers pa ON dq.id = pa.question_id AND pa.user_id = $2` : ''}
            WHERE dq.question_date >= CURRENT_DATE - INTERVAL '6 days'
                AND dq.question_date <= CURRENT_DATE
                AND dq.is_active = true
            GROUP BY DATE(dq.question_date)
            ORDER BY date DESC
        `;
        const dailyActivityResult = await pool.query(dailyActivityQuery, partnerId ? [userId, partnerId] : [userId]);

        // Answer timing analysis
        const timingQuery = `
            SELECT 
                EXTRACT(HOUR FROM ua.answered_at) as hour,
                COUNT(*) as answer_count
            FROM user_daily_answers ua
            JOIN daily_questions dq ON ua.question_id = dq.id
            WHERE ua.user_id = $1
                AND dq.question_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            GROUP BY EXTRACT(HOUR FROM ua.answered_at)
            ORDER BY hour
        `;
        const timingResult = await pool.query(timingQuery, [userId]);

        res.json({
            success: true,
            period: {
                days: parseInt(days),
                startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            },
            overall: {
                totalQuestions: parseInt(stats.total_questions),
                userAnswered: parseInt(stats.user_answered),
                partnerAnswered: partnerId ? parseInt(stats.partner_answered) : null,
                bothAnswered: partnerId ? parseInt(stats.both_answered) : null,
                userAnswerRate: parseFloat(stats.user_answer_rate).toFixed(1),
                partnerAnswerRate: partnerId ? parseFloat(stats.partner_answer_rate).toFixed(1) : null,
                completionRate: partnerId && stats.total_questions > 0 
                    ? ((parseInt(stats.both_answered) / parseInt(stats.total_questions)) * 100).toFixed(1)
                    : null
            },
            byCategory: categoryResult.rows.map(row => ({
                category: row.category,
                totalQuestions: parseInt(row.total_questions),
                answeredCount: parseInt(row.answered_count),
                answerRate: row.total_questions > 0 
                    ? ((parseInt(row.answered_count) / parseInt(row.total_questions)) * 100).toFixed(1)
                    : '0.0'
            })),
            dailyActivity: dailyActivityResult.rows.map(row => ({
                date: row.date,
                questionsAvailable: parseInt(row.questions_available),
                userAnswered: parseInt(row.user_answered),
                partnerAnswered: partnerId ? parseInt(row.partner_answered) : null
            })),
            answerTiming: timingResult.rows.map(row => ({
                hour: parseInt(row.hour),
                answerCount: parseInt(row.answer_count)
            })),
            hasPartner: partnerId !== null
        });

    } catch (error) {
        console.error('Error getting daily questions analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Clear all notifications for the user
const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Clearing all notifications for user ${userId}`);

        const clearQuery = `
            UPDATE daily_notifications 
            SET is_read = true
            WHERE user_id = $1
        `;
        const result = await pool.query(clearQuery, [userId]);

        console.log(`Cleared ${result.rowCount} notifications for user ${userId}`);

        res.json({
            success: true,
            message: 'All notifications cleared',
            clearedCount: result.rowCount
        });

    } catch (error) {
        console.error('Error clearing all notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get missed questions and streak warning
const getMissedQuestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Get missed questions (questions from the last 7 days that user hasn't answered)
        const missedQuestionsQuery = `
            SELECT 
                dq.id,
                dq.question_text,
                dq.category,
                dq.question_date,
                CASE 
                    WHEN dq.question_date = $2 THEN 'today'
                    WHEN dq.question_date = DATE($2 - INTERVAL '1 day') THEN 'yesterday'
                    ELSE 'missed'
                END as status
            FROM daily_questions dq
            LEFT JOIN user_daily_answers uda ON dq.id = uda.question_id AND uda.user_id = $1
            WHERE dq.question_date >= DATE($2 - INTERVAL '6 days')
                AND dq.question_date <= $2
                AND dq.is_active = true
                AND uda.id IS NULL
            ORDER BY dq.question_date DESC
        `;
        const missedQuestionsResult = await pool.query(missedQuestionsQuery, [userId, today]);
        const missedQuestions = missedQuestionsResult.rows;

        // Get current streak info
        const streakQuery = `
            SELECT current_streak, longest_streak
            FROM user_streaks us
            JOIN partner_requests pr ON (us.user_id = pr.requester_id AND us.partner_id = pr.receiver_id) 
                OR (us.user_id = pr.receiver_id AND us.partner_id = pr.requester_id)
            WHERE us.user_id = $1 AND pr.status = 'approved'
        `;
        const streakResult = await pool.query(streakQuery, [userId]);
        const currentStreak = streakResult.rows[0]?.current_streak || 0;

        // Calculate days until streak breaks
        const daysUntilStreakBreaks = Math.max(0, 2 - missedQuestions.length);
        const streakWarning = daysUntilStreakBreaks <= 1;

        // Get partner info for today's question
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

        res.json({
            success: true,
            missedQuestions: missedQuestions.map(q => ({
                id: q.id,
                text: q.question_text,
                category: q.category,
                date: q.question_date,
                status: q.status
            })),
            streakInfo: {
                currentStreak: currentStreak,
                daysUntilStreakBreaks: daysUntilStreakBreaks,
                streakWarning: streakWarning,
                missedCount: missedQuestions.length
            },
            partner: partner ? {
                id: partner.partner_id,
                username: partner.partner_username
            } : null
        });

    } catch (error) {
        console.error('Error getting missed questions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Submit answer for a specific question (for missed questions)
const submitAnswerForQuestion = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId, answerText } = req.body;

        if (!questionId || !answerText || !answerText.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Question ID and answer text are required' 
            });
        }

        // Check if question exists and is active
        const questionQuery = `
            SELECT id, question_date
            FROM daily_questions 
            WHERE id = $1 AND is_active = true
        `;
        const questionResult = await pool.query(questionQuery, [questionId]);
        
        if (questionResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Question not found or inactive' 
            });
        }

        const question = questionResult.rows[0];
        const today = new Date().toISOString().split('T')[0];

        // Check if user has already answered this question
        const existingAnswerQuery = `
            SELECT id FROM user_daily_answers 
            WHERE user_id = $1 AND question_id = $2
        `;
        const existingAnswerResult = await pool.query(existingAnswerQuery, [userId, questionId]);
        
        if (existingAnswerResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already answered this question' 
            });
        }

        // Insert the answer
        const insertAnswerQuery = `
            INSERT INTO user_daily_answers (user_id, question_id, answer_text, answered_at)
            VALUES ($1, $2, $3, NOW())
        `;
        await pool.query(insertAnswerQuery, [userId, questionId, answerText.trim()]);

        // Update streaks if this is today's question or yesterday's question
        if (question.question_date === today || question.question_date === new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]) {
            await updateStreaks(userId, question.question_date);
        }

        res.json({
            success: true,
            message: 'Answer submitted successfully',
            questionDate: question.question_date
        });

    } catch (error) {
        console.error('Error submitting answer for question:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Helper function to update streaks
const updateStreaks = async (userId, questionDate) => {
    try {
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
        
        if (partnerResult.rows.length === 0) return;

        const partnerId = partnerResult.rows[0].partner_id;

        // Check if both partners answered this question
        const bothAnsweredQuery = `
            SELECT 
                (SELECT COUNT(*) FROM user_daily_answers WHERE user_id = $1 AND question_id = $3) as user_answered,
                (SELECT COUNT(*) FROM user_daily_answers WHERE user_id = $2 AND question_id = $3) as partner_answered
        `;
        const bothAnsweredResult = await pool.query(bothAnsweredQuery, [userId, partnerId, questionDate]);
        const bothAnswered = bothAnsweredResult.rows[0];

        if (bothAnswered.user_answered > 0 && bothAnswered.partner_answered > 0) {
            // Both answered, update streaks
            const updateStreakQuery = `
                INSERT INTO user_streaks (user_id, partner_id, current_streak, longest_streak, last_answered_date)
                VALUES ($1, $2, 1, 1, $3)
                ON CONFLICT (user_id, partner_id) 
                DO UPDATE SET 
                    current_streak = CASE 
                        WHEN user_streaks.last_answered_date = DATE($3 - INTERVAL '1 day') 
                        THEN user_streaks.current_streak + 1
                        ELSE 1
                    END,
                    longest_streak = CASE 
                        WHEN user_streaks.last_answered_date = DATE($3 - INTERVAL '1 day') 
                        THEN GREATEST(user_streaks.current_streak + 1, user_streaks.longest_streak)
                        ELSE GREATEST(1, user_streaks.longest_streak)
                    END,
                    last_answered_date = $3
            `;
            await pool.query(updateStreakQuery, [userId, partnerId, questionDate]);
        }
    } catch (error) {
        console.error('Error updating streaks:', error);
    }
};

module.exports = {
    getTodaysQuestion,
    submitAnswer,
    getUserStats,
    getCoupleName,
    setCoupleName,
    getNotifications,
    markNotificationRead,
    getQuestionHistory,
    clearAllNotifications,
    getMissedQuestions,
    submitAnswerForQuestion,
    getPartnerAnswerComparison,
    getDailyQuestionsAnalytics
};
