const tokenService = require('../services/security/tokenService');
const userQueries = require('../services/db/userQueries');

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Get token from header
      token = authHeader.split(' ')[1];

      // Verify token
      const decoded = tokenService.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Get user from the token's ID and attach to request
      req.user = await userQueries.findUserById(decoded.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };