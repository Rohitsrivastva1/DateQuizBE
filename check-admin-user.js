const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function checkAdminUser() {
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
        console.log('🔍 Checking admin user...');
        
        // Get admin user
        const result = await pool.query(
            'SELECT id, username, email, password_hash, full_name, role, permissions, is_active FROM admin_users WHERE username = $1',
            ['admin']
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }
        
        const admin = result.rows[0];
        console.log('✅ Admin user found:', {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            is_active: admin.is_active,
            has_password: !!admin.password_hash
        });
        
        // Test password
        const testPassword = 'admin123';
        const isPasswordValid = await bcrypt.compare(testPassword, admin.password_hash);
        console.log('🔐 Password test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkAdminUser();

