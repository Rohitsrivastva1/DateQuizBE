const { query } = require('../../config/db');
const nodemailer = require('nodemailer');

// Create email transporter
const createEmailTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send email to single user
const sendEmailToUser = async (req, res) => {
    try {
        const { user_id, subject, content, email_type = 'announcement' } = req.body;

        if (!user_id || !subject || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID, subject, and content are required' 
            });
        }

        // Get user details
        const userQuery = 'SELECT id, username, email FROM users WHERE id = $1';
        const userResult = await query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = userResult.rows[0];

        // Create email campaign record
        const campaignQuery = `
            INSERT INTO admin_email_campaigns (
                subject, content, email_type, target_audience, 
                status, total_recipients, created_by
            )
            VALUES ($1, $2, $3, 'custom', 'sending', 1, $4)
            RETURNING id
        `;
        const campaignResult = await query(campaignQuery, [subject, content, email_type, req.admin.id]);
        const campaignId = campaignResult.rows[0].id;

        try {
            // Send email
            const transporter = createEmailTransporter();
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@datequiz.com',
                to: user.email,
                subject: subject,
                html: content
            };

            await transporter.sendMail(mailOptions);

            // Update campaign status
            await query(
                'UPDATE admin_email_campaigns SET status = $1, sent_count = 1, sent_at = NOW() WHERE id = $2',
                ['sent', campaignId]
            );

            // Create recipient record
            await query(
                'INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status, sent_at) VALUES ($1, $2, $3, $4, NOW())',
                [campaignId, user.id, user.email, 'sent']
            );

            res.json({
                success: true,
                message: 'Email sent successfully',
                campaign_id: campaignId
            });

        } catch (emailError) {
            console.error('Email sending error:', emailError);
            
            // Update campaign status to failed
            await query(
                'UPDATE admin_email_campaigns SET status = $1, failed_count = 1 WHERE id = $2',
                ['failed', campaignId]
            );

            // Create recipient record with failed status
            await query(
                'INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status, error_message) VALUES ($1, $2, $3, $4, $5)',
                [campaignId, user.id, user.email, 'failed', emailError.message]
            );

            res.status(500).json({ 
                success: false, 
                message: 'Failed to send email: ' + emailError.message 
            });
        }

    } catch (error) {
        console.error('Send email to user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Send bulk email campaign
const sendBulkEmail = async (req, res) => {
    try {
        const { 
            subject, 
            content, 
            email_type = 'announcement', 
            target_audience = 'all',
            target_criteria = {},
            scheduled_at = null
        } = req.body;

        if (!subject || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Subject and content are required' 
            });
        }

        // Build user query based on target audience
        let userQuery = 'SELECT id, username, email FROM users WHERE 1=1';
        const params = [];
        let paramCount = 0;

        switch (target_audience) {
            case 'premium':
                userQuery += ' AND id IN (SELECT user_id FROM user_insights WHERE premium_user = true)';
                break;
            case 'active':
                userQuery += ' AND last_login >= CURRENT_DATE - INTERVAL \'7 days\'';
                break;
            case 'inactive':
                userQuery += ' AND last_login < CURRENT_DATE - INTERVAL \'30 days\'';
                break;
            case 'custom':
                // Apply custom criteria
                if (target_criteria.city) {
                    paramCount++;
                    userQuery += ` AND city ILIKE $${paramCount}`;
                    params.push(`%${target_criteria.city}%`);
                }
                if (target_criteria.age_min) {
                    paramCount++;
                    userQuery += ` AND age >= $${paramCount}`;
                    params.push(target_criteria.age_min);
                }
                if (target_criteria.age_max) {
                    paramCount++;
                    userQuery += ` AND age <= $${paramCount}`;
                    params.push(target_criteria.age_max);
                }
                if (target_criteria.status) {
                    paramCount++;
                    userQuery += ` AND status = $${paramCount}`;
                    params.push(target_criteria.status);
                }
                break;
        }

        // Get target users
        const usersResult = await query(userQuery, params);
        const users = usersResult.rows;

        if (users.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No users found matching the criteria' 
            });
        }

        // Create email campaign record
        const campaignQuery = `
            INSERT INTO admin_email_campaigns (
                subject, content, email_type, target_audience, 
                target_criteria, status, total_recipients, 
                scheduled_at, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;

        const status = scheduled_at ? 'scheduled' : 'sending';
        const campaignResult = await query(campaignQuery, [
            subject, content, email_type, target_audience,
            JSON.stringify(target_criteria), status, users.length,
            scheduled_at, req.admin.id
        ]);
        const campaignId = campaignResult.rows[0].id;

        // Create recipient records
        for (const user of users) {
            await query(
                'INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status) VALUES ($1, $2, $3, $4)',
                [campaignId, user.id, user.email, 'pending']
            );
        }

        // If not scheduled, send emails immediately
        if (!scheduled_at) {
            // Send emails in background
            setImmediate(async () => {
                await sendCampaignEmails(campaignId, users, subject, content);
            });
        }

        res.json({
            success: true,
            message: scheduled_at ? 'Email campaign scheduled successfully' : 'Email campaign started',
            campaign_id: campaignId,
            total_recipients: users.length
        });

    } catch (error) {
        console.error('Send bulk email error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Helper function to send campaign emails
const sendCampaignEmails = async (campaignId, users, subject, content) => {
    const transporter = createEmailTransporter();
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@datequiz.com',
                to: user.email,
                subject: subject,
                html: content
            };

            await transporter.sendMail(mailOptions);

            // Update recipient status
            await query(
                'UPDATE email_campaign_recipients SET status = $1, sent_at = NOW() WHERE campaign_id = $2 AND user_id = $3',
                ['sent', campaignId, user.id]
            );

            sentCount++;

        } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error);
            
            // Update recipient status
            await query(
                'UPDATE email_campaign_recipients SET status = $1, error_message = $2 WHERE campaign_id = $3 AND user_id = $4',
                ['failed', error.message, campaignId, user.id]
            );

            failedCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign status
    await query(
        'UPDATE admin_email_campaigns SET status = $1, sent_count = $2, failed_count = $3, sent_at = NOW() WHERE id = $4',
        ['sent', sentCount, failedCount, campaignId]
    );
};

// Get email campaigns
const getEmailCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = '', email_type = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            whereClause += ` AND ec.status = $${paramCount}`;
            params.push(status);
        }

        if (email_type) {
            paramCount++;
            whereClause += ` AND ec.email_type = $${paramCount}`;
            params.push(email_type);
        }

        const campaignsQuery = `
            SELECT 
                ec.*,
                au.username as created_by_username,
                au.full_name as created_by_name
            FROM admin_email_campaigns ec
            LEFT JOIN admin_users au ON ec.created_by = au.id
            ${whereClause}
            ORDER BY ec.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        params.push(limit, offset);

        const result = await query(campaignsQuery, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM admin_email_campaigns ec
            ${whereClause}
        `;
        const countResult = await query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            campaigns: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get email campaigns error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get email campaign details
const getEmailCampaignDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Get campaign details
        const campaignQuery = `
            SELECT 
                ec.*,
                au.username as created_by_username,
                au.full_name as created_by_name
            FROM admin_email_campaigns ec
            LEFT JOIN admin_users au ON ec.created_by = au.id
            WHERE ec.id = $1
        `;
        const campaignResult = await query(campaignQuery, [id]);

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Campaign not found' 
            });
        }

        // Get recipient details
        const recipientsQuery = `
            SELECT 
                ecr.*,
                u.username,
                u.email
            FROM email_campaign_recipients ecr
            LEFT JOIN users u ON ecr.user_id = u.id
            WHERE ecr.campaign_id = $1
            ORDER BY ecr.created_at DESC
        `;
        const recipientsResult = await query(recipientsQuery, [id]);

        res.json({
            success: true,
            campaign: campaignResult.rows[0],
            recipients: recipientsResult.rows
        });

    } catch (error) {
        console.error('Get email campaign details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Delete email campaign
const deleteEmailCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if campaign exists
        const campaignExists = await query('SELECT id FROM admin_email_campaigns WHERE id = $1', [id]);
        if (campaignExists.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Campaign not found' 
            });
        }

        // Delete campaign (cascade will handle recipients)
        await query('DELETE FROM admin_email_campaigns WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });

    } catch (error) {
        console.error('Delete email campaign error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    sendEmailToUser,
    sendBulkEmail,
    getEmailCampaigns,
    getEmailCampaignDetails,
    deleteEmailCampaign
};

