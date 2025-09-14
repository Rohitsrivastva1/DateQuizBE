const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:9695@localhost:5432/DateQuizDB',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addGenderDobColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Adding gender and dob columns to users table...');
    
    // Add gender column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20)
    `);
    console.log('✅ Added gender column');
    
    // Add dob column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS dob DATE
    `);
    console.log('✅ Added dob column');
    
    console.log('✅ Successfully added gender and dob columns to users table');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addGenderDobColumns()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
