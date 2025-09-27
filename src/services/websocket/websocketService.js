const WebSocket = require('ws');

class WebSocketService {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.clients = new Map(); // Store connected clients
    this.initialize();
  }

  initialize() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({
      server: this.server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log('✅ WebSocket service initialized');
  }

  verifyClient(info) {
    // Basic verification - can be enhanced later with authentication
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const protocol = url.searchParams.get('protocol');
    
    // Accept connections with journal-chat protocol
    if (protocol === 'journal-chat') {
      return true;
    }
    
    // For now, accept all connections (can be restricted later)
    return true;
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws: ws,
      connectedAt: new Date(),
      userId: null // Will be set when user authenticates
    };

    this.clients.set(clientId, clientInfo);
    ws.clientId = clientId;

    console.log(`🔌 New WebSocket connection: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      message: 'Connected to journal chat service',
      clientId: clientId,
      timestamp: new Date().toISOString()
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('❌ Invalid WebSocket message:', error);
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket connection closed: ${clientId} (${code})`);
      this.clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) {
      console.error('❌ Message from unknown client:', clientId);
      return;
    }

    console.log(`📨 Message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'auth':
        // Handle user authentication
        this.handleAuth(clientId, message);
        break;
      
      case 'join_room':
        // Handle joining a chat room
        this.handleJoinRoom(clientId, message);
        break;
      
      case 'leave_room':
        // Handle leaving a chat room
        this.handleLeaveRoom(clientId, message);
        break;
      
      case 'chat_message':
        // Handle chat messages
        this.handleChatMessage(clientId, message);
        break;
      
      case 'subscribe_journal':
        // Handle journal subscription
        this.handleSubscribeJournal(clientId, message);
        break;
      
      case 'unsubscribe_journal':
        // Handle journal unsubscription
        this.handleUnsubscribeJournal(clientId, message);
        break;
      
      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  handleAuth(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && message.token) {
      try {
        // Decode JWT token to get user ID
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(message.token, process.env.JWT_SECRET || 'your-secret-key');
        
        client.userId = decoded.id;
        client.authenticated = true;
        console.log(`🔐 Client ${clientId} authenticated as user ${decoded.id}`);
        
        this.sendToClient(clientId, {
          type: 'auth_success',
          userId: decoded.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ WebSocket authentication failed:', error);
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        });
      }
    } else if (client && message.userId) {
      // Fallback for direct userId (for backward compatibility)
      client.userId = message.userId;
      client.authenticated = true;
      console.log(`🔐 Client ${clientId} authenticated as user ${message.userId}`);
      
      this.sendToClient(clientId, {
        type: 'auth_success',
        userId: message.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleJoinRoom(clientId, message) {
    // Placeholder for room joining logic
    console.log(`🚪 Client ${clientId} joining room: ${message.roomId}`);
    
    this.sendToClient(clientId, {
      type: 'room_joined',
      roomId: message.roomId,
      timestamp: new Date().toISOString()
    });
  }

  handleLeaveRoom(clientId, message) {
    // Placeholder for room leaving logic
    console.log(`🚪 Client ${clientId} leaving room: ${message.roomId}`);
    
    this.sendToClient(clientId, {
      type: 'room_left',
      roomId: message.roomId,
      timestamp: new Date().toISOString()
    });
  }

  handleChatMessage(clientId, message) {
    // Placeholder for chat message handling
    console.log(`💬 Chat message from ${clientId} in room ${message.roomId}`);
    
    // Echo back for now (can be enhanced to broadcast to room members)
    this.sendToClient(clientId, {
      type: 'message_received',
      messageId: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
  }

  handleSubscribeJournal(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { journalId } = message;
    
    if (!client.subscribedJournals) {
      client.subscribedJournals = [];
    }
    
    if (!client.subscribedJournals.includes(journalId)) {
      client.subscribedJournals.push(journalId);
      console.log(`📝 Client ${clientId} (user ${client.userId}) subscribed to journal ${journalId}`);
    }
    
    this.sendToClient(clientId, {
      type: 'journal_subscribed',
      journalId: journalId,
      timestamp: new Date().toISOString()
    });
  }

  handleUnsubscribeJournal(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { journalId } = message;
    
    if (client.subscribedJournals) {
      client.subscribedJournals = client.subscribedJournals.filter(id => id !== journalId);
      console.log(`📝 Client ${clientId} unsubscribed from journal ${journalId}`);
    }
    
    this.sendToClient(clientId, {
      type: 'journal_unsubscribed',
      journalId: journalId,
      timestamp: new Date().toISOString()
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error(`❌ Error sending message to client ${clientId}:`, error);
        return false;
      }
    }
    return false;
  }

  broadcastToRoom(roomId, data, excludeClientId = null) {
    // Placeholder for room broadcasting logic
    console.log(`📢 Broadcasting to room ${roomId}`);
    
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, {
          ...data,
          roomId: roomId,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastToUser(userId, data) {
    // Send message to all connections from a specific user
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId) {
        this.sendToClient(clientId, {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastToJournal(journalId, data) {
    // Send message to all clients connected to a specific journal
    this.clients.forEach((client, clientId) => {
      if (client.subscribedJournals && client.subscribedJournals.includes(journalId)) {
        this.sendToClient(clientId, {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      connectedAt: client.connectedAt
    }));
  }

  getStats() {
    return {
      totalConnections: this.clients.size,
      connectedClients: this.getConnectedClients(),
      uptime: process.uptime()
    };
  }
}

module.exports = WebSocketService;
