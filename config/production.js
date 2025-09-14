module.exports = {
    // Database configuration for Supabase
    database: {
        host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST,
        port: process.env.SUPABASE_DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
        // ssl: {
        //     rejectUnauthorized: false,
        //     ca: process.env.SUPABASE_DB_CA
        // },
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
                'http://192.168.1.4:3000',
                'http://192.168.1.4:19006',
                'exp://192.168.1.4:19000',
                'exp://localhost:19000',
                'http://localhost:8081',
                'http://192.168.1.4:8081',
                'http://localhost:19000',
                'http://192.168.1.4:19000',
                '*'
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
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log'
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
}; 