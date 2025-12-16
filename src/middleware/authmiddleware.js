const tokenService = require('../services/security/tokenService');
const userQueries = require('../services/db/userQueries');
const { logger } = require('../utils/secureLogger');

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  
  logger.debug('Authentication attempt', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader
  });

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Get token from header
      token = authHeader.split(' ')[1];

      if (!token) {
        logger.warn('Authentication failed: No token provided', {
          path: req.path,
          ip: req.ip
        });
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // Verify token
      const decoded = tokenService.verifyToken(token);
      
      if (!decoded) {
        logger.warn('Authentication failed: Invalid token', {
          path: req.path,
          ip: req.ip
        });
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Get user from the token's ID and attach to request
      req.user = await userQueries.findUserById(decoded.id);
      
      if (!req.user) {
        logger.warn('Authentication failed: User not found', {
          userId: decoded.id,
          path: req.path,
          ip: req.ip
        });
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Log successful authentication
      logger.logAuth('success', req.user.id, {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      // Check if token is expiring soon and refresh it
      if (tokenService.isTokenExpiringSoon(token)) {
        logger.debug('Token expiring soon, refreshing', {
          userId: req.user.id
        });
        const newToken = tokenService.refreshToken(decoded.id);
        
        // Add new token to response headers
        res.setHeader('X-New-Token', newToken);
      }

      next();
    } catch (error) {
      logger.error('Authentication error', {
        error: error.message,
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    logger.warn('Authentication failed: No authorization header', {
      path: req.path,
      ip: req.ip
    });
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };