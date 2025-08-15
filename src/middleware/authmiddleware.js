const tokenService = require('../services/security/tokenService');
const userQueries = require('../services/db/userQueries');

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  
  console.log('Auth header:', authHeader);
  console.log('Request path:', req.path);

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Get token from header
      token = authHeader.split(' ')[1];
      console.log('Token extracted:', token ? 'Present' : 'Missing');

      // Verify token
      const decoded = tokenService.verifyToken(token);
      console.log('Token decoded:', decoded ? 'Success' : 'Failed');
      
      if (!decoded) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Get user from the token's ID and attach to request
      req.user = await userQueries.findUserById(decoded.id);
      console.log('User found:', req.user ? 'Yes' : 'No');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };