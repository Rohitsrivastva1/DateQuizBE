const config = require('./config/production');

console.log('🔍 Supabase Configuration Check');
console.log('================================');

console.log('\n📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('SUPABASE_DB_HOST:', process.env.SUPABASE_DB_HOST || 'not set');
console.log('SUPABASE_DB_PORT:', process.env.SUPABASE_DB_PORT || 'not set');
console.log('SUPABASE_DB_NAME:', process.env.SUPABASE_DB_NAME || 'not set');
console.log('SUPABASE_DB_USER:', process.env.SUPABASE_DB_USER || 'not set');
console.log('SUPABASE_DB_PASSWORD:', process.env.SUPABASE_DB_PASSWORD ? '***set***' : 'not set');

console.log('\n🔧 Database Configurations:');

console.log('\n1. Pooler Configuration:');
console.log('   Host:', config.database.host);
console.log('   Port:', config.database.port);
console.log('   Database:', config.database.database);
console.log('   User:', config.database.user);
console.log('   SSL:', config.database.ssl ? 'enabled' : 'disabled');

console.log('\n2. Direct Configuration:');
console.log('   Host:', config.databaseDirect.host);
console.log('   Port:', config.databaseDirect.port);
console.log('   Database:', config.databaseDirect.database);
console.log('   User:', config.databaseDirect.user);
console.log('   SSL:', config.databaseDirect.ssl ? 'enabled' : 'disabled');

console.log('\n💡 Connection String Examples:');
console.log('Pooler:', `postgresql://${config.database.user}:***@${config.database.host}:${config.database.port}/${config.database.database}`);
console.log('Direct:', `postgresql://${config.databaseDirect.user}:***@${config.databaseDirect.host}:${config.databaseDirect.port}/${config.databaseDirect.database}`);

console.log('\n⚠️  Troubleshooting Tips:');
console.log('1. Check if your Supabase project is active (not paused)');
console.log('2. Verify the connection string in Supabase Dashboard → Settings → Database');
console.log('3. Ensure the database password is correct');
console.log('4. Check if your IP is allowed (if using IP restrictions)');
console.log('5. Try using direct connection instead of pooler if pooler fails');

console.log('\n🔗 Supabase Dashboard Links:');
console.log('- Database Settings: https://supabase.com/dashboard/project/[YOUR-PROJECT]/settings/database');
console.log('- Connection Pooling: https://supabase.com/dashboard/project/[YOUR-PROJECT]/settings/database/pooling'); 