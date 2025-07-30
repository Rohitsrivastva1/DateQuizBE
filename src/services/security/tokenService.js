const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // MODIFIED: Uses an environment variable for expiration with a fallback default.
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
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