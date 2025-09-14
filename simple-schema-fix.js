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

async function fixSchema() {
  try {
    console.log('🔧 Fixing couple_names table schema...');

    // First, check if partner_id column exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'couple_names'
      AND column_name = 'partner_id';
    `;

    const columnResult = await pool.query(checkColumnQuery);

    if (columnResult.rows.length === 0) {
      console.log('📊 Adding partner_id column to couple_names table...');

      // Add the missing partner_id column
      const addColumnQuery = `
        ALTER TABLE couple_names
        ADD COLUMN partner_id INTEGER NOT NULL DEFAULT 0,
        ADD CONSTRAINT fk_couple_names_partner_id
        FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE;
      `;

      await pool.query(addColumnQuery);
      console.log('✅ partner_id column added successfully!');
    } else {
      console.log('✅ partner_id column already exists');
    }

    // Update the unique constraint
    console.log('🔄 Updating unique constraint...');
    try {
      await pool.query('ALTER TABLE couple_names DROP CONSTRAINT couple_names_user_id_partner_id_key;');
      console.log('🗑️  Old constraint dropped');
    } catch (error) {
      console.log('ℹ️  Old constraint not found, that\'s okay');
    }

    await pool.query(`
      ALTER TABLE couple_names
      ADD CONSTRAINT couple_names_unique_users
      UNIQUE (user_id, partner_id);
    `);
    console.log('✅ New unique constraint added');

    // Verify the fix
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'couple_names'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const verifyResult = await pool.query(verifyQuery);
    console.log('📊 Final couple_names table structure:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    await pool.end();
  }
}

fixSchema();
