const { Pool } = require('pg');

async function testAnalytics() {
    const pool = new Pool({
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.epluqupenltlffznbmcx',
        password: '9695700251@Rohit',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔍 Testing analytics queries...');
        
        // Test each table individually
        const tables = [
            'users',
            'questions', 
            'question_categories',
            'user_daily_answers',
            'partner_requests'
        ];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ ${table}: ${result.rows[0].count} records`);
            } catch (error) {
                console.log(`❌ ${table}: ${error.message}`);
            }
        }
        
        // Test the full stats query
        console.log('\n🔍 Testing full stats query...');
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
                (SELECT COUNT(*) FROM questions) as total_questions,
                (SELECT COUNT(*) FROM question_categories) as total_categories,
                (SELECT COUNT(*) FROM user_daily_answers WHERE answered_at >= CURRENT_DATE) as today_answers,
                (SELECT COUNT(*) FROM partner_requests WHERE status = 'approved') as total_partnerships
        `;
        
        const statsResult = await pool.query(statsQuery);
        console.log('✅ Stats query successful:', statsResult.rows[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

testAnalytics();

