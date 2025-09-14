// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Load config based on environment
const config = process.env.NODE_ENV === 'production' 
    ? require('./config/production') 
    : require('./config/development');
const { testConnection } = require('./src/config/db');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting - disabled in development
if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit(config.rateLimit);
    app.use(limiter);
    console.log('🔒 Rate limiting enabled for production');
} else {
    console.log('🚀 Rate limiting disabled for development');
}

// CORS configuration
app.use(cors(config.server.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        res.status(200).json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: dbConnected ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'ERROR', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: 'error',
            error: error.message
        });
    }
});

// Public info endpoint - no login required
app.get('/api/public/info', (req, res) => {
    res.json({
        appName: 'DateQuiz',
        version: '1.0.0',
        features: {
            freePreview: true,
            premiumQuestions: true,
            partnerConnection: true,
            dailyQuestions: true
        },
        message: "Welcome to DateQuiz! Login to unlock all features and connect with your partner."
    });
});

// SSE endpoint for real-time notifications
app.get('/api/notifications/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected", "message": "SSE connection established"}\n\n');

    // Store connection for later use
    req.app.locals.sseConnections = req.app.locals.sseConnections || [];
    req.app.locals.sseConnections.push(res);

    // Handle client disconnect
    req.on('close', () => {
        const index = req.app.locals.sseConnections.indexOf(res);
        if (index > -1) {
            req.app.locals.sseConnections.splice(index, 1);
        }
        console.log(`SSE client disconnected. Active connections: ${req.app.locals.sseConnections.length}`);
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        if (req.app.locals.sseConnections.includes(res)) {
            res.write('data: {"type": "heartbeat", "timestamp": "' + new Date().toISOString() + '"}\n\n');
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);

    console.log(`SSE client connected. Active connections: ${req.app.locals.sseConnections.length}`);
});

// Test endpoint to manually trigger SSE notifications
app.post('/api/notifications/test', (req, res) => {
    try {
        const { type, data } = req.body;
        
        if (!type) {
            return res.status(400).json({ error: 'Notification type is required' });
        }

        const notificationData = {
            type: type,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Send to all connected SSE clients
        if (req.app.locals.sseConnections) {
            req.app.locals.sseConnections.forEach(connection => {
                try {
                    connection.write(`data: ${JSON.stringify(notificationData)}\n\n`);
                } catch (error) {
                    console.error('Error sending test SSE notification:', error);
                }
            });
        }

        res.json({ 
            message: 'Test notification sent', 
            sentTo: req.app.locals.sseConnections?.length || 0,
            data: notificationData
        });

    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

// API routes
app.use('/api/auth', require('./src/api/auth/authRoutes'));
app.use('/api/packs', require('./src/api/packs/packRoutes'));
app.use('/api/partner', require('./src/api/partner/partnerRoutes'));
app.use('/api/partner-turn', require('./src/api/partner/partnerTurnRoutes'));
app.use('/api/daily-questions', require('./src/api/daily-questions/dailyQuestionsRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = config.server.port;
const HOST = config.server.host;

// Test database connection before starting server
const startServer = async () => {
    try {
        console.log('Testing database connection...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Server will start but may have issues.');
        } else {
            console.log('✅ Database connection successful');
        }
        
        app.listen(PORT, HOST, () => {
            console.log(`Server running on ${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`SSE endpoint available at: ${HOST}:${PORT}/api/notifications/stream`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Export the app and sendNotificationToAll function for use in other modules
module.exports = { app, sendNotificationToAll: (data) => {
    if (app.locals.sseConnections) {
        app.locals.sseConnections.forEach(connection => {
            try {
                connection.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('Error sending SSE notification:', error);
            }
        });
    }
}};
