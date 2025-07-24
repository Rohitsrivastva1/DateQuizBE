const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: '1h'});
}

const verifyToken = (token) => {
    try{
        return jwt.verify(token, process.env.JWT_SECRET);
    }catch (error) {
        console.error('Error verifying token', error);
        throw error;
    }
}

module.exports = {
    generateToken,
    verifyToken
}   