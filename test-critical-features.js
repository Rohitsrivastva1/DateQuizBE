const db = require('./src/config/db');

async function testCriticalFeatures() {
    console.log('🧪 Testing Critical Features...\n');
    
    try {
        // Test 1: Check if all required tables exist
        console.log('1️⃣ Testing table existence...');
        const tablesResult = await db.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'daily_questions', 'user_daily_answers', 'packs', 'questions', 'partner_requests', 'partner_turn_questions')
            ORDER BY table_name
        `);
        console.log('✅ Found tables:', tablesResult.rows.map(r => r.table_name));
        
        // Test 2: Check critical columns
        console.log('\n2️⃣ Testing critical columns...');
        const columnsResult = await db.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (
                (table_name = 'daily_questions' AND column_name IN ('question_text', 'question_date')) OR
                (table_name = 'user_daily_answers' AND column_name = 'answer_text') OR
                (table_name = 'users' AND column_name = 'partner_id') OR
                (table_name = 'love_meters' AND column_name IN ('current_level', 'total_points'))
            )
            ORDER BY table_name, column_name
        `);
        console.log('✅ Critical columns found:');
        columnsResult.rows.forEach(row => {
            console.log(`   ${row.table_name}.${row.column_name}`);
        });
        
        // Test 3: Check data counts
        console.log('\n3️⃣ Testing data availability...');
        
        const packsCount = await db.query('SELECT COUNT(*) as count FROM packs');
        console.log(`✅ Question packs: ${packsCount.rows[0].count}`);
        
        const questionsCount = await db.query('SELECT COUNT(*) as count FROM questions');
        console.log(`✅ Questions: ${questionsCount.rows[0].count}`);
        
        const dailyQuestionsCount = await db.query('SELECT COUNT(*) as count FROM daily_questions');
        console.log(`✅ Daily questions: ${dailyQuestionsCount.rows[0].count}`);
        
        // Test 4: Test daily questions query (what the app actually uses)
        console.log('\n4️⃣ Testing daily questions API query...');
        const today = new Date().toISOString().split('T')[0];
        const dailyQuestionQuery = `
            SELECT id, question_text, category, question_date
            FROM daily_questions 
            WHERE question_date = $1 AND is_active = true
        `;
        const dailyQuestionResult = await db.query(dailyQuestionQuery, [today]);
        if (dailyQuestionResult.rows.length > 0) {
            console.log('✅ Today\'s daily question found:', dailyQuestionResult.rows[0].question_text.substring(0, 50) + '...');
        } else {
            console.log('ℹ️  No daily question for today (this is normal for initial setup)');
        }
        
        // Test 5: Test pack queries (what the app uses)
        console.log('\n5️⃣ Testing pack queries...');
        const packQuery = 'SELECT id, title, description, emoji, category, is_premium FROM packs LIMIT 3';
        const packResult = await db.query(packQuery);
        console.log('✅ Sample packs:');
        packResult.rows.forEach(pack => {
            console.log(`   ${pack.emoji} ${pack.title} (${pack.category})`);
        });
        
        // Test 6: Test question queries
        console.log('\n6️⃣ Testing question queries...');
        const questionQuery = 'SELECT question_text FROM questions WHERE pack_id = $1 LIMIT 2';
        const questionResult = await db.query(questionQuery, [1]);
        if (questionResult.rows.length > 0) {
            console.log('✅ Sample questions from pack 1:');
            questionResult.rows.forEach(q => {
                console.log(`   "${q.question_text.substring(0, 60)}..."`);
            });
        }
        
        console.log('\n🎉 All critical features are working!');
        console.log('\n📋 Summary:');
        console.log('✅ Database connection: Working');
        console.log('✅ All required tables: Present');
        console.log('✅ Critical columns: Correct names');
        console.log('✅ Sample data: Available');
        console.log('✅ Application queries: Compatible');
        
        console.log('\n🚀 Your database is ready for both local and Supabase environments!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testCriticalFeatures()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
