const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

function smartSqlSplit(sqlContent) {
    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    const lines = sqlContent.split('\n');
    
    for (let line of lines) {
        // Skip empty lines and comments at the start
        if (!line.trim() || line.trim().startsWith('--')) {
            if (current.trim()) {
                current += '\n' + line;
            }
            continue;
        }
        
        // Add line to current statement
        current += (current ? '\n' : '') + line;
        
        // Check for dollar quotes (for PL/pgSQL functions)
        if (!inSingleQuote && !inDoubleQuote) {
            const dollarMatch = line.match(/\$([^$]*)\$/g);
            if (dollarMatch) {
                for (let match of dollarMatch) {
                    if (!inDollarQuote) {
                        inDollarQuote = true;
                        dollarTag = match;
                    } else if (match === dollarTag) {
                        inDollarQuote = false;
                        dollarTag = '';
                    }
                }
            }
        }
        
        // Check for single quotes
        if (!inDollarQuote && !inDoubleQuote) {
            const singleQuotes = (line.match(/'/g) || []).length;
            if (singleQuotes % 2 !== 0) {
                inSingleQuote = !inSingleQuote;
            }
        }
        
        // Check for double quotes
        if (!inDollarQuote && !inSingleQuote) {
            const doubleQuotes = (line.match(/"/g) || []).length;
            if (doubleQuotes % 2 !== 0) {
                inDoubleQuote = !inDoubleQuote;
            }
        }
        
        // Check for semicolon (end of statement)
        if (!inDollarQuote && !inSingleQuote && !inDoubleQuote && line.includes(';')) {
            // Split on semicolons only when not in quotes
            const parts = line.split(';');
            for (let i = 0; i < parts.length - 1; i++) {
                const statement = current.substring(0, current.lastIndexOf('\n') + 1) + 
                                parts.slice(0, i + 1).join(';');
                if (statement.trim()) {
                    statements.push(statement.trim());
                }
                current = parts.slice(i + 1).join(';');
            }
            current = parts[parts.length - 1];
        }
    }
    
    // Add the last statement if any
    if (current.trim()) {
        statements.push(current.trim());
    }
    
    return statements.filter(stmt => stmt && !stmt.match(/^\s*--/) && stmt !== '');
}

async function runDatabaseFix() {
    try {
        console.log('🔄 Starting database fix...');
        
        // Test connection first
        console.log('🔄 Testing database connection...');
        const testResult = await db.query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful:', testResult.rows[0]);
        
        // Read the SQL fix file
        const sqlFilePath = path.join(__dirname, 'COMPLETE-DATABASE-FIX.sql');
        console.log('🔄 Reading SQL fix file...');
        
        if (!fs.existsSync(sqlFilePath)) {
            throw new Error('COMPLETE-DATABASE-FIX.sql file not found');
        }
        
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        console.log('✅ SQL file loaded successfully');
        
        // Split SQL into individual statements (handle complex blocks like functions)
        const statements = smartSqlSplit(sqlContent);
        
        console.log(`🔄 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim() === '') {
                continue;
            }
            
            try {
                console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
                
                // Log first 100 characters of statement for debugging
                const preview = statement.substring(0, 100).replace(/\n/g, ' ');
                console.log(`   Preview: ${preview}...`);
                
                await db.query(statement);
                successCount++;
                console.log(`✅ Statement ${i + 1} executed successfully`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error in statement ${i + 1}:`, error.message);
                
                // Continue with next statement unless it's a critical error
                if (error.message.includes('already exists')) {
                    console.log('   ℹ️  Resource already exists, continuing...');
                } else {
                    console.error('   Full error:', error);
                }
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 EXECUTION SUMMARY:');
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`❌ Failed statements: ${errorCount}`);
        console.log(`📝 Total statements: ${successCount + errorCount}`);
        
        // Verify the database structure
        console.log('\n🔍 Verifying database structure...');
        await verifyDatabaseStructure();
        
        console.log('\n🎉 Database fix completed!');
        
    } catch (error) {
        console.error('❌ Database fix failed:', error);
        process.exit(1);
    }
}

async function verifyDatabaseStructure() {
    try {
        // Check if all required tables exist
        const requiredTables = [
            'users', 'daily_questions', 'user_daily_answers', 'couple_names', 
            'love_meters', 'user_streaks', 'daily_notifications', 
            'packs', 'questions', 'partner_requests', 'partner_turn_questions'
        ];
        
        console.log('🔍 Checking for required tables...');
        
        const tablesQuery = `
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ANY($1)
        `;
        
        const result = await db.query(tablesQuery, [requiredTables]);
        const existingTables = result.rows.map(row => row.table_name);
        
        console.log('✅ Existing tables:', existingTables.sort());
        
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        if (missingTables.length > 0) {
            console.log('❌ Missing tables:', missingTables);
        } else {
            console.log('✅ All required tables exist!');
        }
        
        // Check critical columns
        console.log('\n🔍 Checking critical columns...');
        
        const criticalColumns = [
            { table: 'daily_questions', column: 'question_text' },
            { table: 'daily_questions', column: 'question_date' },
            { table: 'user_daily_answers', column: 'answer_text' },
            { table: 'users', column: 'partner_id' },
            { table: 'love_meters', column: 'current_level' },
            { table: 'love_meters', column: 'total_points' }
        ];
        
        for (const { table, column } of criticalColumns) {
            const columnQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = $1 
                AND column_name = $2
            `;
            
            const columnResult = await db.query(columnQuery, [table, column]);
            if (columnResult.rows.length > 0) {
                console.log(`✅ ${table}.${column} exists`);
            } else {
                console.log(`❌ ${table}.${column} MISSING`);
            }
        }
        
        // Check data counts
        console.log('\n📊 Checking data counts...');
        
        try {
            const packsResult = await db.query('SELECT COUNT(*) as count FROM packs');
            console.log(`📦 Packs: ${packsResult.rows[0].count}`);
            
            const questionsResult = await db.query('SELECT COUNT(*) as count FROM questions');
            console.log(`❓ Questions: ${questionsResult.rows[0].count}`);
            
            const dailyQuestionsResult = await db.query('SELECT COUNT(*) as count FROM daily_questions');
            console.log(`📅 Daily Questions: ${dailyQuestionsResult.rows[0].count}`);
            
        } catch (error) {
            console.log('ℹ️  Could not check data counts (tables may not exist yet)');
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Run the database fix
if (require.main === module) {
    runDatabaseFix()
        .then(() => {
            console.log('🎉 All done! Your database should now be ready.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { runDatabaseFix, verifyDatabaseStructure };
