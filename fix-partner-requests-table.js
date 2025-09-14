require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'datequiz',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
});

async function fixPartnerRequestsTable() {
  try {
    console.log('🔧 Fixing partner_requests table...\n');

    // Check current structure
    const currentStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'partner_requests'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Current partner_requests table structure:');
    currentStructure.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Add missing columns
    console.log('\n📝 Adding missing columns...');

    // Add status column
    await pool.query(`
      ALTER TABLE partner_requests
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied'));
    `);
    console.log('✅ Added status column');

    // Add message column
    await pool.query(`
      ALTER TABLE partner_requests
      ADD COLUMN IF NOT EXISTS message TEXT;
    `);
    console.log('✅ Added message column');

    // Check final structure
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'partner_requests'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Final partner_requests table structure:');
    finalStructure.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n🎉 partner_requests table fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing partner_requests table:', error.message);
  } finally {
    await pool.end();
  }
}

fixPartnerRequestsTable();
