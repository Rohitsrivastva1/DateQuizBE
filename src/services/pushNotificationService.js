const { Expo } = require('expo-server-sdk');
const db = require('../config/db');

class PushNotificationService {
    constructor() {
        this.expo = new Expo();
    }

    // Get user's push token from database
    async getUserPushToken(userId) {
        try {
            const query = 'SELECT push_token FROM users WHERE id = $1';
            const result = await db.query(query, [userId]);
            return result.rows[0]?.push_token || null;
        } catch (error) {
            console.error('Error getting user push token:', error);
            return null;
        }
    }

    // Save user's push token to database
    async saveUserPushToken(userId, pushToken) {
        try {
            const query = 'UPDATE users SET push_token = $1 WHERE id = $2';
            await db.query(query, [pushToken, userId]);
            console.log(`Push token saved for user ${userId}`);
        } catch (error) {
            console.error('Error saving user push token:', error);
        }
    }

    // Send push notification to a single user
    async sendPushNotification(userId, title, body, data = {}) {
        try {
            const pushToken = await this.getUserPushToken(userId);
            
            if (!pushToken) {
                console.log(`No push token found for user ${userId}`);
                return false;
            }

            // Check if the push token is valid
            if (!Expo.isExpoPushToken(pushToken)) {
                console.log(`Invalid push token for user ${userId}: ${pushToken}`);
                return false;
            }

            // Create the notification message
            const message = {
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
                priority: 'high',
                channelId: 'default',
            };

            // Send the notification
            const chunks = this.expo.chunkPushNotifications([message]);
            const tickets = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }

            console.log(`Push notification sent to user ${userId}: ${title}`);
            return true;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return false;
        }
    }

    // Send partner request notification
    async sendPartnerRequestNotification(receiverId, requesterUsername) {
        return await this.sendPushNotification(
            receiverId,
            'New Partner Request! 💌',
            `${requesterUsername} wants to be your partner!\n\nTap to accept or decline.`,
            {
                type: 'partner-request',
                requesterUsername
            }
        );
    }

    // Send partner response notification
    async sendPartnerResponseNotification(requesterId, receiverUsername, isAccepted) {
        const title = isAccepted ? 'Partner Request Accepted! 💕' : 'Partner Request Declined';
        const body = isAccepted 
            ? `${receiverUsername} accepted your partner request! You are now partners! 💕`
            : `${receiverUsername} declined your partner request.`;

        return await this.sendPushNotification(
            requesterId,
            title,
            body,
            {
                type: 'partner-response',
                receiverUsername,
                isAccepted
            }
        );
    }

    // Send journal message notification
    async sendJournalMessageNotification(receiverId, senderUsername, messageContent, journalId) {
        const truncatedContent = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent;

        return await this.sendPushNotification(
            receiverId,
            'New Journal Message 💬',
            `${senderUsername}: ${truncatedContent}`,
            {
                type: 'journal-message',
                journalId: journalId,
                senderUsername
            }
        );
    }

    // Send partner turn notification
    async sendPartnerTurnNotification(userId, questionText, isWaitingForMe) {
        const title = isWaitingForMe ? 'Your Turn! 💕' : 'Partner Answered! 💕';
        const body = isWaitingForMe 
            ? `Your partner answered: "${questionText}"\n\nTap to answer now!`
            : `Your partner answered: "${questionText}"\n\nTap to view their answer!`;

        return await this.sendPushNotification(
            userId,
            title,
            body,
            {
                type: isWaitingForMe ? 'partner-turn' : 'partner-answered',
                questionText
            }
        );
    }

    // Send both answers complete notification
    async sendBothAnswersCompleteNotification(userId, questionText) {
        return await this.sendPushNotification(
            userId,
            'Both Answers Ready! 🎉',
            `You and your partner have both answered: "${questionText}"\n\nTap to reveal your answers!`,
            {
                type: 'both-answers-complete',
                questionText
            }
        );
    }

    // Send daily question notification
    async sendDailyQuestionNotification(userId, questionText) {
        return await this.sendPushNotification(
            userId,
            'Daily Question! 💭',
            `Today's question: "${questionText}"\n\nTap to answer!`,
            {
                type: 'daily-question',
                questionText
            }
        );
    }

    // Send streak milestone notification
    async sendStreakMilestoneNotification(userId, streakCount) {
        return await this.sendPushNotification(
            userId,
            'Streak Milestone! 🔥',
            `Congratulations! You've reached a ${streakCount}-day streak with your partner!`,
            {
                type: 'streak-milestone',
                streakCount
            }
        );
    }

    // Send love meter milestone notification
    async sendLoveMeterMilestoneNotification(userId, loveMeterLevel) {
        return await this.sendPushNotification(
            userId,
            'Love Meter Milestone! 💕',
            `Your love meter has reached level ${loveMeterLevel}! Keep the love growing!`,
            {
                type: 'love-meter-milestone',
                loveMeterLevel
            }
        );
    }

    // Send custom notification
    async sendCustomNotification(userId, title, body, data = {}) {
        return await this.sendPushNotification(userId, title, body, data);
    }

    // Send notification to multiple users
    async sendBulkPushNotifications(userIds, title, body, data = {}) {
        const results = [];
        
        for (const userId of userIds) {
            const result = await this.sendPushNotification(userId, title, body, data);
            results.push({ userId, success: result });
        }

        return results;
    }

    // Check notification delivery status
    async checkNotificationStatus(ticketIds) {
        try {
            const receipts = await this.expo.getPushNotificationReceiptsAsync(ticketIds);
            
            for (const receiptId in receipts) {
                const receipt = receipts[receiptId];
                
                if (receipt.status === 'error') {
                    console.error(`Push notification error: ${receipt.message}`);
                    
                    if (receipt.details && receipt.details.error) {
                        console.error(`Error details: ${receipt.details.error}`);
                    }
                } else if (receipt.status === 'ok') {
                    console.log(`Push notification delivered successfully: ${receiptId}`);
                }
            }
        } catch (error) {
            console.error('Error checking notification status:', error);
        }
    }
}

module.exports = new PushNotificationService();

