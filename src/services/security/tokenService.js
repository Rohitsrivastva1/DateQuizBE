const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // Use the same JWT secret and expiration as configured
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

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

module.exports = {
    generateToken,
    verifyToken
};