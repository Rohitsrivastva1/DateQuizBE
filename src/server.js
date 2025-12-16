const http = require('http');
const app = require('./app');
console.log('🔌 Loading Socket.IO service...');
let SocketIOService;
try {
  SocketIOService = require('./services/socketio/socketioService');
  console.log('🔌 Socket.IO service loaded:', !!SocketIOService);
  console.log('🔌 SocketIOService constructor:', typeof SocketIOService);
} catch (error) {
  console.error('❌ Error loading Socket.IO service:', error);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO service immediately after creating the server
console.log('🔌 Initializing Socket.IO service...');
console.log('🔌 Server object:', !!server);
console.log('🔌 SocketIOService module:', !!SocketIOService);

try {
  console.log('🔌 Creating SocketIOService instance...');
  const socketService = new SocketIOService(server);
  console.log('🔌 SocketIOService instance created:', !!socketService);
  
  // Make Socket.IO service available globally for middleware
  global.socketService = socketService;
  console.log('✅ Socket.IO service initialized and available globally');
  console.log('✅ Socket.IO server attached to HTTP server');
} catch (error) {
  console.error('❌ Error initializing Socket.IO service:', error);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Socket.IO available at http://localhost:${PORT}/socket.io/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket info: http://localhost:${PORT}/ws-info`);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('HTTP server closed');
    console.log('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;




