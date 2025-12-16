const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketIOService {
  constructor(server) {
    console.log('🔌 Initializing Socket.IO service...');

    // Create Socket.IO server
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? [
            'https://unfoldusweb.onrender.com',
            'https://date-quiz-web7.onrender.com',
            'https://your-frontend-domain.com'
          ]
          : [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:19006',
            'http://10.0.2.2:3000',
            'exp://192.168.1.100:19000',
            'exp://localhost:19000',
            'https://unfoldusweb.onrender.com',
            'https://date-quiz-web7.onrender.com'
          ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      connectionStateRecovery: true,
      pingTimeout: 30000,
      pingInterval: 25000,
      // allowEIO3: true, // uncomment if client uses Socket.IO v2
      path: '/socket.io/'
    });

    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.journalRooms = new Map(); // journalId -> Set of socketIds

    this.initialize();
  }

  initialize() {
    console.log('🔌 Setting up Socket.IO event handlers...');

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handler
    this.io.on('connection', this.handleConnection.bind(this));

    console.log('✅ Socket.IO service initialized');
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      console.log('🔐 Socket authentication attempt:');
      console.log('   Auth token:', socket.handshake.auth.token ? 'Present' : 'Missing');
      console.log('   Query token:', socket.handshake.query.token ? 'Present' : 'Missing');
      console.log('   Final token:', token ? 'Present' : 'Missing');

      if (!token) {
        console.log('❌ No token provided');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
      console.log('✅ Token verified for user:', decoded.id);
      socket.userId = decoded.id;
      socket.userData = decoded;
      next();
    } catch (error) {
      console.error('❌ Socket authentication failed:', error.message);
      console.error('❌ Error details:', error);
      next(new Error('Authentication failed'));
    }
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`🔌 User ${userId} connected with socket ${socketId}`);

    // Store user connection
    this.connectedUsers.set(userId, socketId);
    this.userSockets.set(socketId, userId);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time chat service',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // Handle journal subscription
    socket.on('subscribe_journal', (data) => {
      this.handleJournalSubscription(socket, data);
    });

    // Handle journal unsubscription
    socket.on('unsubscribe_journal', (data) => {
      this.handleJournalUnsubscription(socket, data);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Handle message read receipts
    socket.on('message_read', (data) => {
      this.handleMessageRead(socket, data);
    });

    // Handle Truth or Dare Game Events
    socket.on('join_game', (data) => this.handleJoinGame(socket, data));
    socket.on('spin_bottle', (data) => this.handleSpinBottle(socket, data));
    socket.on('draw_card', (data) => this.handleDrawCard(socket, data));
    socket.on('next_turn', (data) => this.handleNextTurn(socket, data));
    socket.on('toggle_mode', (data) => this.handleToggleMode(socket, data));

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  }

  handleJournalSubscription(socket, data) {
    const { journalId } = data || {};
    const userId = socket.userId;

    if (!journalId) {
      socket.emit('error', { message: 'Journal ID required' });
      return;
    }

    // Join the journal room (idempotent)
    const room = `journal_${journalId}`;
    if (!socket.rooms.has(room)) {
      socket.join(room);
    }

    // Track journal room membership
    if (!this.journalRooms.has(journalId)) {
      this.journalRooms.set(journalId, new Set());
    }
    this.journalRooms.get(journalId).add(socket.id);

    console.log(`📝 User ${userId} subscribed to journal ${journalId}`);
    socket.emit('journal_subscribed', { journalId, timestamp: new Date().toISOString() });
  }

  handleJournalUnsubscription(socket, data) {
    const { journalId } = data || {};
    const userId = socket.userId;

    if (!journalId) {
      socket.emit('error', { message: 'Journal ID required' });
      return;
    }

    // Leave the journal room (idempotent)
    const room = `journal_${journalId}`;
    if (socket.rooms.has(room)) {
      socket.leave(room);
    }

    // Remove from journal room tracking
    if (this.journalRooms.has(journalId)) {
      this.journalRooms.get(journalId).delete(socket.id);
      if (this.journalRooms.get(journalId).size === 0) this.journalRooms.delete(journalId);
    }

    console.log(`📝 User ${userId} unsubscribed from journal ${journalId}`);
    socket.emit('journal_unsubscribed', { journalId, timestamp: new Date().toISOString() });
  }

  handleTypingStart(socket, data) {
    const { journalId } = data;
    const userId = socket.userId;

    if (journalId) {
      socket.to(`journal_${journalId}`).emit('user_typing', {
        userId,
        journalId,
        isTyping: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleTypingStop(socket, data) {
    const { journalId } = data;
    const userId = socket.userId;

    if (journalId) {
      socket.to(`journal_${journalId}`).emit('user_typing', {
        userId,
        journalId,
        isTyping: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleMessageRead(socket, data) {
    const { messageId, journalId } = data;
    const userId = socket.userId;

    if (journalId) {
      socket.to(`journal_${journalId}`).emit('message_read', {
        messageId,
        userId,
        journalId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`🔌 User ${userId} disconnected (socket ${socketId})`);

    // Remove from tracking
    this.connectedUsers.delete(userId);
    this.userSockets.delete(socketId);

    // Remove from all journal rooms
    this.journalRooms.forEach((socketIds, journalId) => {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.journalRooms.delete(journalId);
      }
    });
  }

  // Broadcast new message to journal subscribers
  broadcastToJournal(journalId, messageData) {
    try {
      console.log(`📢 Broadcasting to journal ${journalId}:`, messageData.type);
      const room = `journal_${journalId}`;
      const hasRoom = this.io.sockets.adapter.rooms.has(room);
      if (!hasRoom) {
        // No subscribers; do nothing (do not throw)
        return;
      }
      this.io.to(room).emit('new_message', {
        ...messageData,
        journalId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('❌ Broadcast error:', err.message);
    }
  }

  // Broadcast to specific user
  broadcastToUser(userId, messageData) {
    console.log(`📢 Broadcasting to user ${userId}:`, messageData.type);

    this.io.to(`user_${userId}`).emit('notification', {
      ...messageData,
      timestamp: new Date().toISOString()
    });
  }

  // Get partner ID for a user
  async getPartnerId(userId) {
    try {
      const db = require('../../config/db');
      const query = 'SELECT partner_id FROM users WHERE id = $1';
      const { rows } = await db.query(query, [userId]);
      return rows[0]?.partner_id || null;
    } catch (error) {
      console.error('Error getting partner ID:', error);
      return null;
    }
  }

  // Broadcast to partner of a user
  async broadcastToPartner(userId, messageData) {
    const partnerId = await this.getPartnerId(userId);
    if (partnerId) {
      this.broadcastToUser(partnerId, messageData);
    }
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.keys()),
      journalRooms: this.journalRooms.size,
      uptime: process.uptime()
    };
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get online users count for a journal
  getJournalOnlineCount(journalId) {
    return this.journalRooms.get(journalId)?.size || 0;
  }

  // --- TRUTH OR DARE GAME HANDLERS ---

  handleJoinGame(socket, data) {
    const { coupleId } = data;
    if (!coupleId) return;

    const room = `game_${coupleId}`;
    socket.join(room);
    console.log(`🎮 User ${socket.userId} joined game room ${room}`);

    // Notify others in the room that partner joined
    socket.to(room).emit('partner_joined', { userId: socket.userId });

    const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomSize >= 2) {
      this.io.to(room).emit('game_ready');
    }
  }

  handleSpinBottle(socket, data) {
    const { coupleId } = data;
    const room = `game_${coupleId}`;

    // Broadcast spin start event
    this.io.to(room).emit('spin_started', { duration: 3000 });

    setTimeout(() => {
      // Determine result
      const type = Math.random() > 0.5 ? 'truth' : 'dare';
      const angle = Math.floor(Math.random() * 360);

      this.io.to(room).emit('spin_result', {
        type,
        angle,
        selectedBy: socket.userId // Who spun it
      });
    }, 3000);
  }

  handleDrawCard(socket, data) {
    const { coupleId, type, text } = data;
    const room = `game_${coupleId}`;

    // Broadcast drawn card to everyone in the room
    this.io.to(room).emit('card_drawn', {
      type,
      text,
      drawnBy: socket.userId
    });
  }

  handleNextTurn(socket, data) {
    const { coupleId } = data;
    const room = `game_${coupleId}`;
    // Notify partner it's their turn
    socket.to(room).emit('your_turn');
  }

  handleToggleMode(socket, data) {
    const { coupleId, isExtreme } = data;
    const room = `game_${coupleId}`;
    // Broadcast mode change to everyone in room (including sender if we want confirmation, or just partner)
    // Broadcasting to room ensures consistency
    this.io.to(room).emit('mode_update', { isExtreme });
  }
}

module.exports = SocketIOService;
