const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // Use the same JWT secret and expiration as configured
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '30d'; // 30 days of inactivity

    return jwt.sign({ id: userId }, jwtSecret, { expiresIn });
};

const refreshToken = (userId) => {
    // Generate a new token with fresh 30-day expiration
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
    
    return jwt.sign({ id: userId }, jwtSecret, { expiresIn });
};

const verifyToken = (token) => {
    try {
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        // This is a good place to handle specific JWT errors if needed,
        // for example, logging a 'TokenExpiredError' differently.
        console.error('Error verifying token:', error.name);
        throw error;
    }
};

const isTokenExpiringSoon = (token) => {
    try {
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        const decoded = jwt.verify(token, jwtSecret);
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        
        // Refresh if token expires in less than 7 days
        return timeUntilExpiry < (7 * 24 * 60 * 60);
    } catch (error) {
        return true; // If we can't decode, consider it expired
    }
};

module.exports = {
    generateToken,
    refreshToken,
    verifyToken,
    isTokenExpiringSoon
};