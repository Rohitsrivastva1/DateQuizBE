const { pool } = require('./src/config/db');

async function fixDatabaseSchema() {
    console.log('🔧 Starting Database Schema Fixes...\n');

    try {
        // Fix 1: Add missing partner_id column to user_streaks table
        console.log('1. Adding partner_id column to user_streaks table...');
        await pool.query(`
            ALTER TABLE user_streaks
            ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        `);
        console.log('✅ Added partner_id to user_streaks\n');

        // Fix 2: Add missing columns to love_meters table
        console.log('2. Adding missing columns to love_meters table...');
        await pool.query(`
            ALTER TABLE love_meters
            ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS questions_answered_together INTEGER DEFAULT 0
        `);
        console.log('✅ Added total_points, current_level, questions_answered_together to love_meters\n');

        // Fix 3: Add updated_at column to couple_names table
        console.log('3. Adding updated_at column to couple_names table...');
        await pool.query(`
            ALTER TABLE couple_names
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ Added updated_at to couple_names\n');

        // Fix 4: Add answer_text column to user_daily_answers table
        console.log('4. Adding answer_text column to user_daily_answers table...');
        await pool.query(`
            ALTER TABLE user_daily_answers
            ADD COLUMN IF NOT EXISTS answer_text TEXT
        `);
        // Copy existing answer data to answer_text
        await pool.query(`
            UPDATE user_daily_answers
            SET answer_text = answer
            WHERE answer_text IS NULL AND answer IS NOT NULL
        `);
        console.log('✅ Added answer_text to user_daily_answers and copied data\n');

        // Fix 5: Add question_text and question_date columns to daily_questions table
        console.log('5. Adding question_text and question_date columns to daily_questions table...');
        await pool.query(`
            ALTER TABLE daily_questions
            ADD COLUMN IF NOT EXISTS question_text TEXT,
            ADD COLUMN IF NOT EXISTS question_date DATE DEFAULT CURRENT_DATE
        `);
        // Copy existing question data to question_text
        await pool.query(`
            UPDATE daily_questions
            SET question_text = question,
                question_date = CURRENT_DATE
            WHERE question_text IS NULL AND question IS NOT NULL
        `);
        console.log('✅ Added question_text and question_date to daily_questions\n');

        // Fix 6: Add push_token column to users table (if not exists)
        console.log('6. Adding push_token column to users table...');
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS push_token TEXT
        `);
        console.log('✅ Added push_token to users\n');

        // Fix 7: Add message column to daily_notifications table (if not exists)
        console.log('7. Adding message column to daily_notifications table...');
        await pool.query(`
            ALTER TABLE daily_notifications
            ADD COLUMN IF NOT EXISTS message TEXT
        `);
        console.log('✅ Added message to daily_notifications\n');

        // Fix 8: Add status column to partner_requests table (if not exists)
        console.log('8. Adding status column to partner_requests table...');
        await pool.query(`
            ALTER TABLE partner_requests
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
        `);
        console.log('✅ Added status to partner_requests\n');

        console.log('🎉 All database schema fixes completed successfully!\n');

        // Verify the fixes by checking table schemas
        console.log('🔍 Verifying fixes...\n');

        const tablesToCheck = [
            'user_streaks',
            'love_meters',
            'couple_names',
            'user_daily_answers',
            'daily_questions',
            'users',
            'daily_notifications',
            'partner_requests'
        ];

        for (const tableName of tablesToCheck) {
            console.log(`Checking ${tableName} table...`);
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            console.log(`✅ ${tableName} has ${result.rows.length} columns:`);
            result.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            console.log('');
        }

        console.log('🎉 Database schema verification completed!\n');

    } catch (error) {
        console.error('❌ Error fixing database schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the fix
if (require.main === module) {
    fixDatabaseSchema()
        .then(() => {
            console.log('✅ Database schema fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Database schema fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixDatabaseSchema };
