module.exports = {
    // Database configuration for local development
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'datequiz',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9695700251@Rohit',
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            origin: [
                'http://localhost:3000',
                'http://localhost:19006',
                'http://192.168.31.53:3000',
                'http://192.168.31.53:19006',
                'exp://192.168.31.53:19000',
                'exp://localhost:19000',
                'http://localhost:8081',
                'http://192.168.31.53:8081',
                'http://localhost:19000',
                'http://192.168.31.53:19000'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: '7d'
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        file: process.env.LOG_FILE || './logs/app.log'
    },
    
    // Rate limiting - DISABLED for development
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 0 // 0 means no limit (disabled)
    }
};
