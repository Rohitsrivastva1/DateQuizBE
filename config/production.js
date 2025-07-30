module.exports = {
    // Database configuration for Supabase
    database: {
        host: process.env.DB_PORT || process.env.DB_HOST,
        port: process.env.SUPABASE_DB_PORT || 6543,
        database: process.env.DB_NAME || process.env.DB_NAME,
        user: process.env.DB_USER || process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: false, // Disable SSL completely
        // Additional parameters for connection pooler
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        // Required for Supabase connection pooler
        application_name: 'datequiz-backend',
        // Disable statement timeout for pooler
        statement_timeout: 0,
        // Set session timeout
        session_timeout: 0
    },
    
    // Alternative direct connection config (for fallback)
    databaseDirect: {
        host: (process.env.SUPABASE_DB_HOST || process.env.DB_HOST).replace('.pooler.', '.'),
        port: process.env.SUPABASE_DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: false, // Disable SSL completely
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        application_name: 'datequiz-backend-direct'
    },
    
    // SSL-enabled configurations for testing
    databaseSSL: {
        host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST,
        port: process.env.SUPABASE_DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        application_name: 'datequiz-backend-ssl'
    },
    
    databaseDirectSSL: {
        host: (process.env.SUPABASE_DB_HOST || process.env.DB_HOST).replace('.pooler.', '.'),
        port: process.env.SUPABASE_DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        application_name: 'datequiz-backend-direct-ssl'
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
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