const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
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
        console.log('🔍 Resetting admin password...');
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Update admin password
        const result = await pool.query(
            'UPDATE admin_users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
            [hashedPassword, 'admin']
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('✅ Admin password reset successfully:', result.rows[0]);
        
        // Test the new password
        const testResult = await pool.query(
            'SELECT password_hash FROM admin_users WHERE username = $1',
            ['admin']
        );
        
        const isPasswordValid = await bcrypt.compare('admin123', testResult.rows[0].password_hash);
        console.log('🔐 Password test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

resetAdminPassword();

