module.exports = {
    // Database configuration using connection string
    database: {
        connectionString:  "postgresql://postgres.epluqupenltlffznbmcx:9695700251@Rohit@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
        ssl: {
            rejectUnauthorized: false
        }, // No SSL for local development
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: '7d'
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log'
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
}; 