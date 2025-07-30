const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // MODIFIED: Uses an environment variable for expiration with a fallback default.
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    return jwt.sign({ id: userId }, secret, { expiresIn });
};

const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        return jwt.verify(token, secret);
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