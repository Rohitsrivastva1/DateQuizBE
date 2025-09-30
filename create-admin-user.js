const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdminUser(username = 'RohitAd', password = '9695700251') {
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
        console.log('🔍 Creating admin user...', username);
        
        // Check if admin user already exists
        const existingUser = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            console.log('✅ Admin user already exists');
            return;
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user
        const result = await pool.query(
            `INSERT INTO admin_users (username, email, password_hash, full_name, role, permissions, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, username, email, role`,
            [
                username,
                `${username}@datequiz.com`,
                hashedPassword,
                'Administrator',
                'super_admin',
                JSON.stringify({
                    users: true,
                    questions: true,
                    categories: true,
                    emails: true,
                    analytics: true,
                    settings: true,
                    admin_users: true
                }),
                true
            ]
        );
        
        console.log('✅ Admin user created successfully:', result.rows[0]);
        
    } catch (error) {
        console.error('❌ Failed to create admin user:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Allow overriding via CLI args
const usernameArg = process.argv[2] || 'RohitAd';
const passwordArg = process.argv[3] || '9695700251';
createAdminUser(usernameArg, passwordArg);

