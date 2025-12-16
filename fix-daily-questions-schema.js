/**
 * Fix Daily Questions Database Schema
 * 
 * This script fixes the column name mismatches:
 * - Renames 'question' to 'question_text' in daily_questions table
 * - Renames 'answer' to 'answer_text' in user_daily_answers table
 * - Ensures 'question_date' column exists
 * - Creates missing indexes
 */

const pool = require('./src/config/db');

async function fixDailyQuestionsSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting Daily Questions schema fix...\n');

        await client.query('BEGIN');

        // Step 1: Check current schema
        console.log('📋 Checking current schema...');
        const tableCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'daily_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('Current daily_questions columns:');
        tableCheck.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Step 2: Fix daily_questions table
        console.log('\n🔨 Fixing daily_questions table...');
        
        // Check if question_date exists
        const hasQuestionDate = tableCheck.rows.some(col => col.column_name === 'question_date');
        if (!hasQuestionDate) {
            console.log('  ➕ Adding question_date column...');
            await client.query(`
                ALTER TABLE daily_questions 
                ADD COLUMN IF NOT EXISTS question_date DATE DEFAULT CURRENT_DATE
            `);
        }

        // Check if question_text exists, if not rename question to question_text
        const hasQuestionText = tableCheck.rows.some(col => col.column_name === 'question_text');
        const hasQuestion = tableCheck.rows.some(col => col.column_name === 'question');
        
        if (hasQuestion && !hasQuestionText) {
            console.log('  🔄 Renaming question column to question_text...');
            await client.query(`
                ALTER TABLE daily_questions 
                RENAME COLUMN question TO question_text
            `);
        } else if (!hasQuestionText && !hasQuestion) {
            console.log('  ➕ Adding question_text column...');
            await client.query(`
                ALTER TABLE daily_questions 
                ADD COLUMN question_text TEXT NOT NULL DEFAULT ''
            `);
            // If question column exists, copy data
            if (hasQuestion) {
                await client.query(`
                    UPDATE daily_questions 
                    SET question_text = question 
                    WHERE question_text = ''
                `);
            }
        }

        // Step 3: Fix user_daily_answers table
        console.log('\n🔨 Fixing user_daily_answers table...');
        const answerTableCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_daily_answers'
            ORDER BY ordinal_position
        `);

        const hasAnswerText = answerTableCheck.rows.some(col => col.column_name === 'answer_text');
        const hasAnswer = answerTableCheck.rows.some(col => col.column_name === 'answer');
        
        if (hasAnswer && !hasAnswerText) {
            console.log('  🔄 Renaming answer column to answer_text...');
            await client.query(`
                ALTER TABLE user_daily_answers 
                RENAME COLUMN answer TO answer_text
            `);
        } else if (!hasAnswerText && !hasAnswer) {
            console.log('  ➕ Adding answer_text column...');
            await client.query(`
                ALTER TABLE user_daily_answers 
                ADD COLUMN answer_text TEXT
            `);
            // Copy data from answer if it exists
            if (hasAnswer) {
                await client.query(`
                    UPDATE user_daily_answers 
                    SET answer_text = answer 
                    WHERE answer_text IS NULL
                `);
                await client.query(`
                    ALTER TABLE user_daily_answers 
                    ALTER COLUMN answer_text SET NOT NULL
                `);
            }
        }

        // Step 4: Create/Update indexes
        console.log('\n📊 Creating indexes...');
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_daily_questions_date 
             ON daily_questions(question_date, is_active)`,
            `CREATE INDEX IF NOT EXISTS idx_daily_questions_category 
             ON daily_questions(category)`,
            `CREATE INDEX IF NOT EXISTS idx_user_daily_answers_user_id 
             ON user_daily_answers(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_daily_answers_question_id 
             ON user_daily_answers(question_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_daily_answers_answered_at 
             ON user_daily_answers(answered_at)`,
            `CREATE INDEX IF NOT EXISTS idx_user_daily_answers_user_question 
             ON user_daily_answers(user_id, question_id)`
        ];

        for (const indexSQL of indexes) {
            await client.query(indexSQL);
            console.log(`  ✅ Created index: ${indexSQL.split('ON')[1].trim()}`);
        }

        // Step 5: Update existing rows to have question_date if null
        console.log('\n🔄 Updating existing rows...');
        const updateResult = await client.query(`
            UPDATE daily_questions 
            SET question_date = COALESCE(question_date, CURRENT_DATE)
            WHERE question_date IS NULL
        `);
        console.log(`  ✅ Updated ${updateResult.rowCount} rows with question_date`);

        // Step 6: Ensure question_date has default constraint
        console.log('\n🔧 Setting default constraints...');
        await client.query(`
            ALTER TABLE daily_questions 
            ALTER COLUMN question_date SET DEFAULT CURRENT_DATE
        `);

        await client.query('COMMIT');
        
        console.log('\n✅ Daily Questions schema fix completed successfully!\n');
        
        // Verify the fix
        console.log('📋 Verifying schema...');
        const verifyQuery = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'daily_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('\nFinal daily_questions schema:');
        verifyQuery.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        const verifyAnswersQuery = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'user_daily_answers'
            ORDER BY ordinal_position
        `);
        
        console.log('\nFinal user_daily_answers schema:');
        verifyAnswersQuery.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error fixing schema:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the fix
fixDailyQuestionsSchema()
    .then(() => {
        console.log('\n✨ Schema fix completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Schema fix failed:', error);
        process.exit(1);
    });

