const { Pool } = require('pg');
const config = require('./config/production');

console.log('🔧 Setting up local development database...');
console.log('==========================================');

console.log('\n📋 Database Configuration:');
console.log('Connection String:', config.database.connectionString);
console.log('SSL:', config.database.ssl ? 'enabled' : 'disabled');

console.log('\n💡 To set up PostgreSQL locally:');
console.log('1. Install PostgreSQL: https://www.postgresql.org/download/');
console.log('2. Create database:');
console.log('   createdb DateQuizDB');
console.log('3. Or using psql:');
console.log('   psql -U postgres -c "CREATE DATABASE DateQuizDB;"');

console.log('\n🔧 Environment Variables (optional):');
console.log('DB_URL=postgres://postgres:9695@localhost:5432/DateQuizDB');

console.log('\n📝 SQL Commands to run:');
console.log('-- Create database (if not exists)');
console.log('CREATE DATABASE DateQuizDB;');

console.log('\n-- Create tables (run these in your database)');
console.log('-- Copy and paste the contents of partner_turn_schema.sql');

console.log('\n✅ Ready for local development!');
console.log('Run: npm run dev'); 