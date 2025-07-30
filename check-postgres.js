const { exec } = require('child_process');
const { Pool } = require('pg');
const config = require('./config/production');

console.log('🔍 Checking PostgreSQL Setup...');
console.log('==============================');

// Check if PostgreSQL service is running
console.log('\n1. Checking if PostgreSQL is running...');

exec('pg_isready -h localhost -p 5432', (error, stdout, stderr) => {
    if (error) {
        console.log('❌ PostgreSQL is not running or not accessible');
        console.log('\n💡 To start PostgreSQL:');
        console.log('Windows:');
        console.log('  - Open Services (services.msc)');
        console.log('  - Find "PostgreSQL" service');
        console.log('  - Right-click → Start');
        console.log('\n  OR');
        console.log('  - Open Command Prompt as Administrator');
        console.log('  - Run: net start postgresql-x64-15');
        console.log('\nmacOS/Linux:');
        console.log('  sudo service postgresql start');
        console.log('  OR');
        console.log('  brew services start postgresql');
    } else {
        console.log('✅ PostgreSQL is running');
        
        // Test database connection
        console.log('\n2. Testing database connection...');
        const pool = new Pool(config.database);
        
        pool.query('SELECT NOW()', (err, result) => {
            if (err) {
                console.log('❌ Database connection failed:', err.message);
                console.log('\n💡 Database setup needed:');
                console.log('1. Create database: createdb DateQuizDB');
                console.log('2. Or using psql: psql -U postgres -c "CREATE DATABASE DateQuizDB;"');
                console.log('3. Run migrations: npm run migrate');
            } else {
                console.log('✅ Database connection successful');
                console.log('✅ Database is ready for use');
            }
            pool.end();
        });
    }
});

console.log('\n📋 Current Configuration:');
console.log('Connection String:', config.database.connectionString);
console.log('SSL:', config.database.ssl ? 'enabled' : 'disabled'); 