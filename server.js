const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/production');
const { testConnection } = require('./src/config/db');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use(limiter);

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
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', require('./src/api/auth/authRoutes'));
app.use('/api/packs', require('./src/api/packs/packRoutes'));
app.use('/api/partner', require('./src/api/partner/partnerRoutes'));
app.use('/api/partner-turn', require('./src/api/partner/partnerTurnRoutes'));

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

// Start server only after database connection is established
const startServer = async () => {
    try {
        // Test database connection before starting server
        await testConnection();
        
        app.listen(PORT, HOST, () => {
            console.log(`Server running on ${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server due to database connection issue:', error);
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
