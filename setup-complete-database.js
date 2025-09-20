/**
 * Complete Database Setup Script
 * This script creates all necessary tables for the DateQuiz application
 * 
 * Usage: node setup-complete-database.js
 * 
 * This will:
 * 1. Create the missing users table (CRITICAL)
 * 2. Create all other required tables
 * 3. Add proper indexes for performance
 * 4. Insert sample data
 * 5. Verify the setup
 */

const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./src/config/db');

class DatabaseSetup {
    constructor() {
        this.setupSteps = [];
        this.errors = [];
        this.successCount = 0;
        this.totalSteps = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            step: '🔄'
        }[type] || 'ℹ️';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async executeStep(stepName, sqlQuery, isCritical = false) {
        this.totalSteps++;
        this.log(`Executing: ${stepName}`, 'step');
        
        try {
            await query(sqlQuery);
            this.successCount++;
            this.log(`Success: ${stepName}`, 'success');
            return true;
        } catch (error) {
            this.errors.push({ step: stepName, error: error.message, critical: isCritical });
            this.log(`Failed: ${stepName} - ${error.message}`, 'error');
            
            if (isCritical) {
                this.log(`CRITICAL ERROR: ${stepName} failed. This may break the application!`, 'error');
            }
            
            return false;
        }
    }

    async setupUsersTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                age INTEGER,
                city VARCHAR(100),
                gender VARCHAR(20),
                dob DATE,
                partner_id INTEGER REFERENCES users(id),
                push_token TEXT,
                is_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await this.executeStep('Create Users Table', sql, true);
        
        // Create indexes for users table
        const indexes = [
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);',
            'CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);',
            'CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email, is_verified);'
        ];
        
        for (const indexSQL of indexes) {
            await this.executeStep('Create Users Indexes', indexSQL);
        }
    }

    async setupDailyQuestionsSystem() {
        const tables = [
            {
                name: 'Daily Questions Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS daily_questions (
                        id SERIAL PRIMARY KEY,
                        question TEXT NOT NULL,
                        category VARCHAR(50) DEFAULT 'general',
                        question_date DATE NOT NULL DEFAULT CURRENT_DATE,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `
            },
            {
                name: 'User Daily Answers Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_daily_answers (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        question_id INTEGER NOT NULL,
                        answer TEXT NOT NULL,
                        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (question_id) REFERENCES daily_questions(id) ON DELETE CASCADE,
                        UNIQUE(user_id, question_id)
                    );
                `
            }
        ];

        for (const table of tables) {
            await this.executeStep(table.name, table.sql);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(question_date, is_active);',
            'CREATE INDEX IF NOT EXISTS idx_daily_questions_category ON daily_questions(category);',
            'CREATE INDEX IF NOT EXISTS idx_user_daily_answers_user_id ON user_daily_answers(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_user_daily_answers_question_id ON user_daily_answers(question_id);',
            'CREATE INDEX IF NOT EXISTS idx_user_daily_answers_answered_at ON user_daily_answers(answered_at);'
        ];

        for (const indexSQL of indexes) {
            await this.executeStep('Create Daily Questions Indexes', indexSQL);
        }
    }

    async setupPartnerSystem() {
        const tables = [
            {
                name: 'Couple Names Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS couple_names (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        partner_id INTEGER NOT NULL,
                        couple_name VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id, partner_id)
                    );
                `
            }
        ];

        for (const table of tables) {
            await this.executeStep(table.name, table.sql);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_couple_names_users ON couple_names(user_id, partner_id);'
        ];

        for (const indexSQL of indexes) {
            await this.executeStep('Create Partner System Indexes', indexSQL);
        }
    }

    async setupGamificationTables() {
        const tables = [
            {
                name: 'User Streaks Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_streaks (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        partner_id INTEGER REFERENCES users(id),
                        current_streak INTEGER DEFAULT 0,
                        longest_streak INTEGER DEFAULT 0,
                        last_answered_date DATE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id)
                    );
                `
            },
            {
                name: 'Love Meters Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS love_meters (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        partner_id INTEGER NOT NULL,
                        love_score INTEGER DEFAULT 0,
                        current_level INTEGER DEFAULT 1,
                        questions_answered_together INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id, partner_id)
                    );
                `
            }
        ];

        for (const table of tables) {
            await this.executeStep(table.name, table.sql);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_user_streaks_partner ON user_streaks(partner_id);',
            'CREATE INDEX IF NOT EXISTS idx_love_meters_users ON love_meters(user_id, partner_id);'
        ];

        for (const indexSQL of indexes) {
            await this.executeStep('Create Gamification Indexes', indexSQL);
        }
    }

    async setupNotificationSystem() {
        const tables = [
            {
                name: 'Daily Notifications Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS daily_notifications (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        notification_type VARCHAR(50) NOT NULL,
                        title VARCHAR(200) NOT NULL,
                        message TEXT NOT NULL,
                        is_read BOOLEAN DEFAULT false,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                `
            },
            {
                name: 'Push Tokens Table',
                sql: `
                    CREATE TABLE IF NOT EXISTS push_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        token TEXT NOT NULL,
                        platform VARCHAR(20) NOT NULL,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id, token)
                    );
                `
            }
        ];

        for (const table of tables) {
            await this.executeStep(table.name, table.sql);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_daily_notifications_user_id ON daily_notifications(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_daily_notifications_is_read ON daily_notifications(is_read);',
            'CREATE INDEX IF NOT EXISTS idx_daily_notifications_created_at ON daily_notifications(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);'
        ];

        for (const indexSQL of indexes) {
            await this.executeStep('Create Notification Indexes', indexSQL);
        }
    }

    async insertSampleData() {
        const sampleQuestions = [
            'What is your biggest dream for our future together?',
            'What is something you\'ve always wanted to learn?',
            'What is your favorite memory of us?',
            'What is something that always makes you laugh?',
            'What is your biggest fear about relationships?',
            'What is something you\'d like me to do more often?',
            'What is your ideal date night?',
            'What is something you find attractive about me?',
            'What is your love language?',
            'What is something you want to accomplish together?'
        ];

        const categories = ['deep', 'personal', 'romantic', 'fun', 'deep', 'relationship', 'romantic', 'romantic', 'relationship', 'future'];

        for (let i = 0; i < sampleQuestions.length; i++) {
            const sql = `
                INSERT INTO daily_questions (question, category, question_date) 
                VALUES ($1, $2, CURRENT_DATE + INTERVAL '${i} days')
                ON CONFLICT DO NOTHING;
            `;
            
            await this.executeStep(`Insert Sample Question ${i + 1}`, sql);
        }
    }

    async verifySetup() {
        this.log('Verifying database setup...', 'step');
        
        try {
            const result = await query(`
                SELECT 
                    table_name,
                    CASE 
                        WHEN table_name = 'users' THEN 'CRITICAL - User authentication'
                        WHEN table_name IN ('daily_questions', 'user_daily_answers') THEN 'Daily questions system'
                        WHEN table_name IN ('couple_names', 'love_meters') THEN 'Partner system'
                        WHEN table_name IN ('user_streaks') THEN 'Gamification'
                        WHEN table_name IN ('daily_notifications', 'push_tokens') THEN 'Notifications'
                        ELSE 'Other'
                    END as purpose
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY 
                    CASE 
                        WHEN table_name = 'users' THEN 1
                        WHEN table_name IN ('daily_questions', 'user_daily_answers') THEN 2
                        WHEN table_name IN ('couple_names', 'love_meters') THEN 3
                        WHEN table_name IN ('user_streaks') THEN 4
                        WHEN table_name IN ('daily_notifications', 'push_tokens') THEN 5
                        ELSE 6
                    END,
                    table_name;
            `);

            this.log('\n📋 DATABASE TABLES CREATED:', 'info');
            result.rows.forEach(row => {
                this.log(`  ✅ ${row.table_name} - ${row.purpose}`, 'success');
            });

            return result.rows.length;
        } catch (error) {
            this.log(`Verification failed: ${error.message}`, 'error');
            return 0;
        }
    }

    async runCompleteSetup() {
        this.log('🚀 Starting Complete Database Setup for DateQuiz App', 'info');
        this.log('=' .repeat(60), 'info');

        // Test connection first
        this.log('Testing database connection...', 'step');
        const connected = await testConnection();
        if (!connected) {
            this.log('❌ Cannot connect to database. Setup aborted.', 'error');
            process.exit(1);
        }

        // Setup core systems
        await this.setupUsersTable();
        await this.setupDailyQuestionsSystem();
        await this.setupPartnerSystem();
        await this.setupGamificationTables();
        await this.setupNotificationSystem();
        
        // Insert sample data
        await this.insertSampleData();

        // Verify setup
        const tableCount = await this.verifySetup();

        // Summary
        this.log('\n' + '=' .repeat(60), 'info');
        this.log('📊 SETUP SUMMARY', 'info');
        this.log(`✅ Successful steps: ${this.successCount}/${this.totalSteps}`, 'success');
        this.log(`❌ Failed steps: ${this.errors.length}`, this.errors.length === 0 ? 'success' : 'error');
        this.log(`📋 Tables created: ${tableCount}`, 'info');

        if (this.errors.length > 0) {
            this.log('\n⚠️  ERRORS ENCOUNTERED:', 'warning');
            this.errors.forEach(error => {
                const critical = error.critical ? ' (CRITICAL)' : '';
                this.log(`  ❌ ${error.step}: ${error.error}${critical}`, 'error');
            });
        }

        // Check for critical errors
        const criticalErrors = this.errors.filter(e => e.critical);
        if (criticalErrors.length > 0) {
            this.log('\n🚨 CRITICAL ERRORS FOUND!', 'error');
            this.log('The application may not work properly until these are resolved.', 'error');
            process.exit(1);
        }

        if (this.errors.length === 0) {
            this.log('\n🎉 Database setup completed successfully!', 'success');
            this.log('Your DateQuiz app should now work properly.', 'success');
        } else {
            this.log('\n⚠️  Setup completed with some non-critical errors.', 'warning');
            this.log('The core functionality should work, but some features may be limited.', 'warning');
        }

        process.exit(0);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new DatabaseSetup();
    setup.runCompleteSetup().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

module.exports = DatabaseSetup;
