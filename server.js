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

// API routes
app.use('/api/auth', require('./src/api/auth/authRoutes'));
app.use('/api/packs', require('./src/api/packs/packRoutes'));
app.use('/api/partner', require('./src/api/partner/partnerRoutes'));
app.use('/api/partner-turn', require('./src/api/partner/partnerTurnRoutes'));
app.use('/api/daily-questions', require('./src/api/daily-questions/dailyQuestionsRoutes'));
app.use('/api/journal', require('./src/api/journal/journalRoutes'));
app.use('/api/journal', require('./src/api/journal/mediaRoutes'));

// Admin API routes
app.use('/api/admin', require('./src/api/admin/adminRoutes'));

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
        });
    } catch (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
