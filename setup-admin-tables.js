const { Pool } = require('pg');
const fs = require('fs');

async function setupAdminTables() {
    // Use the same configuration as the working backend
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
        console.log('🔍 Setting up admin tables...');
        
        // Read and execute core schema
        console.log('Creating core schema...');
        const coreSchemaSQL = fs.readFileSync('./core_schema.sql', 'utf8');
        await pool.query(coreSchemaSQL);
        
        // Read and execute daily questions schema
        console.log('Creating daily questions schema...');
        const dailyQuestionsSchemaSQL = fs.readFileSync('./daily_questions_schema.sql', 'utf8');
        await pool.query(dailyQuestionsSchemaSQL);
        
        // Read and execute admin schema
        console.log('Creating admin schema...');
        const adminSchemaSQL = fs.readFileSync('./admin_schema.sql', 'utf8');
        await pool.query(adminSchemaSQL);
        
        console.log('✅ Admin tables setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupAdminTables();
