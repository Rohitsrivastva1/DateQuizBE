require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'datequiz',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function updateNotificationTypes() {
    try {
        console.log('🚀 Starting notification types update...');
        
        // Drop existing constraint if it exists
        await pool.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'daily_notifications_notification_type_check'
                ) THEN
                    ALTER TABLE daily_notifications DROP CONSTRAINT daily_notifications_notification_type_check;
                END IF;
            END $$;
        `);
        
        // Add new constraint with updated notification types
        await pool.query(`
            ALTER TABLE daily_notifications 
            ADD CONSTRAINT daily_notifications_notification_type_check 
            CHECK (notification_type IN (
                'question_sent', 
                'partner_answered', 
                'answers_revealed', 
                'streak_milestone', 
                'love_meter_milestone',
                'partner_request',
                'partner_response'
            ));
        `);
        
        console.log('✅ Notification types updated successfully!');
        console.log('📝 Added new types: partner_request, partner_response');
        
    } catch (error) {
        console.error('❌ Error updating notification types:', error);
    } finally {
        await pool.end();
    }
}

updateNotificationTypes();
