#!/usr/bin/env node

/**
 * Comprehensive API Testing Suite for DateQuiz
 * Tests all endpoints and functionality
 */

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

// Test data
let testUsers = [];
let testTokens = {};
let testQuestions = [];
let testPacks = [];

// Utility functions
const makeRequest = async (endpoint, options = {}) => {
    const baseURL = 'http://192.168.1.4:5000';
    const url = `${baseURL}${endpoint}`;

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json().catch(() => ({}));

        return {
            status: response.status,
            ok: response.ok,
            data,
            error: !response.ok ? data : null
        };
    } catch (error) {
        return {
            status: 0,
            ok: false,
            data: null,
            error: { message: error.message }
        };
    }
};

const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warning: '\x1b[33m',
        reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

const testSection = (name) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TESTING: ${name}`);
    console.log(`${'='.repeat(60)}\n`);
};

// Test functions
async function testDatabaseConnection() {
    testSection('DATABASE CONNECTION');

    try {
        const result = await pool.query('SELECT NOW() as current_time');
        log('✅ Database connection successful', 'success');
        log(`🕒 Server time: ${result.rows[0].current_time}`);
        return true;
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'error');
        return false;
    }
}

async function testUserCreation() {
    testSection('USER CREATION & AUTHENTICATION');

    const testUsersData = [
        { email: 'test1@example.com', name: 'testuser1', password: 'password123', age: 25, city: 'New York' },
        { email: 'test2@example.com', name: 'testuser2', password: 'password123', age: 28, city: 'Los Angeles' },
    ];

    for (let i = 0; i < testUsersData.length; i++) {
        const userData = testUsersData[i];

        // Test signup
        log(`📝 Creating user: ${userData.username}`);
        const signupResult = await makeRequest('/api/auth/signup', {
            method: 'POST',
            body: userData
        });

        if (signupResult.ok) {
            log(`✅ User ${userData.name} created successfully`, 'success');
            testUsers.push(signupResult.data.user);

            // Test login
            const loginResult = await makeRequest('/api/auth/login', {
                method: 'POST',
                body: {
                    username: userData.name,
                    password: userData.password
                }
            });

            if (loginResult.ok) {
                log(`✅ User ${userData.name} logged in successfully`, 'success');
                testTokens[userData.name] = loginResult.data.token;
            } else {
                log(`❌ Login failed for ${userData.name}: ${loginResult.error?.message}`, 'error');
            }
        } else {
            log(`❌ Signup failed for ${userData.name}: ${signupResult.error?.message}`, 'error');
        }
    }

    return testUsers.length === testUsersData.length && Object.keys(testTokens).length === testUsersData.length;
}

async function testProfileEndpoints() {
    testSection('PROFILE ENDPOINTS');

    let successCount = 0;

    for (const username of Object.keys(testTokens)) {
        const token = testTokens[username];

        const profileResult = await makeRequest('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (profileResult.ok) {
            log(`✅ Profile fetched for ${username}`, 'success');
            successCount++;
        } else {
            log(`❌ Profile fetch failed for ${username}: ${profileResult.error?.message}`, 'error');
        }
    }

    return successCount === Object.keys(testTokens).length;
}

async function testPacksAndQuestions() {
    testSection('PACKS & QUESTIONS');

    let successCount = 0;
    const categories = ['deep', 'fun', 'romantic'];

    for (const category of categories) {
        const packsResult = await makeRequest(`/api/packs?category=${category}`);

        if (packsResult.ok && packsResult.data.packs) {
            log(`✅ Fetched ${packsResult.data.packs.length} packs for category: ${category}`, 'success');
            testPacks = testPacks.concat(packsResult.data.packs);

            // Test getting questions for first pack
            if (packsResult.data.packs.length > 0) {
                const firstPack = packsResult.data.packs[0];
                const token = Object.values(testTokens)[0]; // Use first user's token

                const questionsResult = await makeRequest(`/api/packs/${firstPack.id}/questions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (questionsResult.ok) {
                    log(`✅ Fetched questions for pack: ${firstPack.title}`, 'success');
                    successCount++;
                } else {
                    log(`❌ Failed to fetch questions for pack ${firstPack.title}: ${questionsResult.error?.message}`, 'error');
                }
            }
        } else {
            log(`❌ Failed to fetch packs for category ${category}: ${packsResult.error?.message}`, 'error');
        }
    }

    return successCount > 0;
}

async function testPartnerSystem() {
    testSection('PARTNER SYSTEM');

    if (Object.keys(testTokens).length < 2) {
        log('⚠️  Need at least 2 users for partner testing', 'warning');
        return false;
    }

    const usernames = Object.keys(testTokens);
    const user1 = usernames[0];
    const user2 = usernames[1];
    const token1 = testTokens[user1];
    const token2 = testTokens[user2];

    let successCount = 0;

    // Test partner status (should be no partner initially)
    const status1 = await makeRequest('/api/partner/status', {
        headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json'
        }
    });

    if (status1.ok) {
        log(`✅ Partner status checked for ${user1}`, 'success');
        successCount++;
    } else {
        log(`❌ Partner status check failed for ${user1}: ${status1.error?.message}`, 'error');
    }

    // Send partner request from user1 to user2
    const requestResult = await makeRequest('/api/partner/request', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json'
        },
        body: { receiverUsername: user2 }
    });

    if (requestResult.ok) {
        log(`✅ Partner request sent from ${user1} to ${user2}`, 'success');
        successCount++;
    } else {
        log(`❌ Partner request failed: ${requestResult.error?.message}`, 'error');
        return false; // Can't continue without successful request
    }

    // Check incoming requests for user2
    const incomingRequests = await makeRequest('/api/partner/request', {
        headers: {
            'Authorization': `Bearer ${token2}`,
            'Content-Type': 'application/json'
        }
    });

    if (incomingRequests.ok) {
        log(`✅ Incoming requests checked for ${user2}`, 'success');
        successCount++;

        // Accept the partner request if there are any
        if (incomingRequests.data.requests && incomingRequests.data.requests.length > 0) {
            const acceptResult = await makeRequest('/api/partner/request/respond', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token2}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    requestId: incomingRequests.data.requests[0].id,
                    response: 'approved'
                }
            });

            if (acceptResult.ok) {
                log(`✅ Partner request accepted by ${user2}`, 'success');
                successCount++;
            } else {
                log(`❌ Partner request acceptance failed: ${acceptResult.error?.message}`, 'error');
            }
        } else {
            log(`❌ No incoming requests found for ${user2}`, 'error');
        }
    } else {
        log(`❌ Incoming requests check failed for ${user2}: ${incomingRequests.error?.message}`, 'error');
    }

    // Check partner status after connection
    const statusAfter = await makeRequest('/api/partner/status', {
        headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json'
        }
    });

    if (statusAfter.ok && statusAfter.data.hasPartner) {
        log(`✅ Users ${user1} and ${user2} are now connected as partners`, 'success');
        successCount++;
    } else {
        log(`❌ Partner connection verification failed: ${statusAfter.error?.message}`, 'error');
    }

    return successCount >= 3;
}

async function testPartnerTurnSystem() {
    testSection('PARTNER TURN SYSTEM');

    if (Object.keys(testTokens).length < 2) {
        log('⚠️  Need at least 2 users for partner turn testing', 'warning');
        return false;
    }

    const usernames = Object.keys(testTokens);
    const user1 = usernames[0];
    const user2 = usernames[1];
    const token1 = testTokens[user1];
    const token2 = testTokens[user2];

    let successCount = 0;

    // Test getting partner decks
    const decksResult = await makeRequest('/api/partner-turn/decks', {
        headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json'
        }
    });

    if (decksResult.ok) {
        log(`✅ Partner decks fetched for ${user1}`, 'success');
        successCount++;

        // Test starting a partner turn if decks are available
        if (decksResult.data && decksResult.data.length > 0) {
            const firstDeck = decksResult.data[0];

            const startResult = await makeRequest('/api/partner-turn/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token1}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    deckId: firstDeck.id,
                    partnerUsername: user2
                }
            });

            if (startResult.ok) {
                log(`✅ Partner turn started by ${user1}`, 'success');
                successCount++;

                // Test getting unread partner turns
                const unreadResult = await makeRequest('/api/partner-turn/unread', {
                    headers: {
                        'Authorization': `Bearer ${token2}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (unreadResult.ok) {
                    log(`✅ Unread partner turns checked for ${user2}`, 'success');
                    successCount++;
                } else {
                    log(`❌ Unread partner turns check failed: ${unreadResult.error?.message}`, 'error');
                }
            } else {
                log(`❌ Partner turn start failed: ${startResult.error?.message}`, 'error');
            }
        }
    } else {
        log(`❌ Partner decks fetch failed: ${decksResult.error?.message}`, 'error');
    }

    return successCount >= 2;
}

async function testAdvancedDailyQuestions() {
    testSection('ADVANCED DAILY QUESTIONS');

    if (Object.keys(testTokens).length === 0) {
        log('⚠️  No authenticated users for advanced daily questions testing', 'warning');
        return false;
    }

    const username = Object.keys(testTokens)[0];
    const token = testTokens[username];
    let successCount = 0;

    // Test setting couple name
    const coupleNameResult = await makeRequest('/api/daily-questions/couple-name', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: { coupleName: 'Test Couple' }
    });

    if (coupleNameResult.ok) {
        log(`✅ Couple name set for ${username}`, 'success');
        successCount++;
    } else {
        log(`❌ Couple name setting failed: ${coupleNameResult.error?.message}`, 'error');
    }

    // Test question history
    const historyResult = await makeRequest('/api/daily-questions/history', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (historyResult.ok) {
        log(`✅ Question history fetched for ${username}`, 'success');
        successCount++;
    } else {
        log(`❌ Question history fetch failed: ${historyResult.error?.message}`, 'error');
    }

    // Test missed questions
    const missedResult = await makeRequest('/api/daily-questions/missed', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (missedResult.ok) {
        log(`✅ Missed questions fetched for ${username}`, 'success');
        successCount++;
    } else {
        log(`❌ Missed questions fetch failed: ${missedResult.error?.message}`, 'error');
    }

    return successCount >= 2;
}

async function testDailyQuestions() {
    testSection('DAILY QUESTIONS SYSTEM');

    if (Object.keys(testTokens).length === 0) {
        log('⚠️  No authenticated users for daily questions testing', 'warning');
        return false;
    }

    const username = Object.keys(testTokens)[0];
    const token = testTokens[username];
    let successCount = 0;

    // Test getting today's question
    const todayResult = await makeRequest('/api/daily-questions/today', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (todayResult.ok) {
        log(`✅ Today's question fetched for ${username}`, 'success');
        successCount++;

        // Test submitting an answer
        if (todayResult.data.question) {
            const answerResult = await makeRequest('/api/daily-questions/answer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    questionId: todayResult.data.question.id,
                    answer: 'This is a test answer from the API test suite!'
                }
            });

            if (answerResult.ok) {
                log(`✅ Answer submitted successfully for ${username}`, 'success');
                successCount++;
            } else {
                log(`❌ Answer submission failed: ${answerResult.error?.message}`, 'error');
            }
        }
    } else {
        log(`❌ Today's question fetch failed: ${todayResult.error?.message}`, 'error');
    }

    // Test user stats
    const statsResult = await makeRequest('/api/daily-questions/stats', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (statsResult.ok) {
        log(`✅ Daily questions stats fetched for ${username}`, 'success');
        successCount++;
    } else {
        log(`❌ Stats fetch failed: ${statsResult.error?.message}`, 'error');
    }

    return successCount >= 2;
}

async function testNotifications() {
    testSection('NOTIFICATION SYSTEM');

    if (Object.keys(testTokens).length === 0) {
        log('⚠️  No authenticated users for notification testing', 'warning');
        return false;
    }

    const username = Object.keys(testTokens)[0];
    const token = testTokens[username];

    // Test getting notifications
    const notificationsResult = await makeRequest('/api/daily-questions/notifications', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (notificationsResult.ok) {
        log(`✅ Notifications fetched for ${username}`, 'success');
        return true;
    } else {
        log(`❌ Notifications fetch failed: ${notificationsResult.error?.message}`, 'error');
        return false;
    }
}

async function testHealthEndpoint() {
    testSection('HEALTH CHECK');

    const healthResult = await makeRequest('/health');

    if (healthResult.ok) {
        log('✅ Health check passed', 'success');
        return true;
    } else {
        log(`❌ Health check failed: ${healthResult.error?.message}`, 'error');
        return false;
    }
}

async function cleanupTestData() {
    testSection('CLEANUP TEST DATA');

    try {
        // Clear test users and their data
        const testUsernames = Object.keys(testTokens);

        if (testUsernames.length > 0) {
            const placeholders = testUsernames.map((_, i) => `$${i + 1}`).join(', ');
            const query = `DELETE FROM users WHERE username IN (${placeholders})`;

            await pool.query(query, testUsernames);
            log(`✅ Cleaned up ${testUsernames.length} test users`, 'success');
        }

        // Clear any remaining test data
        await pool.query("DELETE FROM couple_names WHERE couple_name LIKE $1", ['Test%']);
        await pool.query("DELETE FROM daily_notifications WHERE title LIKE $1", ['Test%']);

        log('✅ Test data cleanup completed', 'success');
        return true;
    } catch (error) {
        log(`❌ Cleanup failed: ${error.message}`, 'error');
        return false;
    }
}

async function runFullTestSuite() {
    console.log('🚀 Starting DateQuiz API Test Suite\n');
    console.log('📋 Test Coverage:');
    console.log('   • Database Connection');
    console.log('   • User Authentication (Signup/Login)');
    console.log('   • Profile Management');
    console.log('   • Packs & Questions');
    console.log('   • Partner System (Basic)');
    console.log('   • Partner Turn System');
    console.log('   • Daily Questions (Basic)');
    console.log('   • Daily Questions (Advanced)');
    console.log('   • Notifications');
    console.log('   • Health Check');
    console.log('   • Data Cleanup\n');

    const results = {
        database: false,
        users: false,
        profiles: false,
        packs: false,
        partners: false,
        partnerTurns: false,
        questions: false,
        advancedQuestions: false,
        notifications: false,
        health: false,
        cleanup: false
    };

    // Run all tests
    results.database = await testDatabaseConnection();
    results.users = await testUserCreation();
    results.profiles = await testProfileEndpoints();
    results.packs = await testPacksAndQuestions();
    results.partners = await testPartnerSystem();
    results.partnerTurns = await testPartnerTurnSystem();
    results.questions = await testDailyQuestions();
    results.advancedQuestions = await testAdvancedDailyQuestions();
    results.notifications = await testNotifications();
    results.health = await testHealthEndpoint();
    results.cleanup = await cleanupTestData();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    // Format test names nicely
    const testNameMap = {
        database: 'Database Connection',
        users: 'User Authentication',
        profiles: 'Profile Management',
        packs: 'Packs & Questions',
        partners: 'Partner System (Basic)',
        partnerTurns: 'Partner Turn System',
        questions: 'Daily Questions (Basic)',
        advancedQuestions: 'Daily Questions (Advanced)',
        notifications: 'Notifications',
        health: 'Health Check',
        cleanup: 'Data Cleanup'
    };

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const displayName = testNameMap[test] || test.charAt(0).toUpperCase() + test.slice(1);
        console.log(`${status} ${displayName}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 OVERALL RESULT: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Your API is working perfectly!');
    } else if (passedTests >= totalTests * 0.8) {
        console.log('⚠️  MOST TESTS PASSED - Minor issues to address');
    } else {
        console.log('❌ SEVERAL TESTS FAILED - Significant issues need attention');
    }

    console.log('='.repeat(60));

    // Exit with appropriate code
    process.exit(passedTests === totalTests ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Test suite interrupted. Cleaning up...');
    await cleanupTestData();
    process.exit(130);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Test suite terminated. Cleaning up...');
    await cleanupTestData();
    process.exit(143);
});

// Run the test suite
if (require.main === module) {
    runFullTestSuite().catch(error => {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = {
    runFullTestSuite,
    makeRequest,
    testDatabaseConnection,
    testUserCreation,
    testProfileEndpoints,
    testPacksAndQuestions,
    testPartnerSystem,
    testDailyQuestions,
    testNotifications,
    testHealthEndpoint,
    cleanupTestData
};
