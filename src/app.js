require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./api/auth/authRoutes');
const adminRoutes = require('./api/admin/adminRoutes');
const partnerRoutes = require('./api/partner/partnerRoutes');
const packRoutes = require('./api/packs/packRoutes');
const journalRoutes = require('./api/journal/journalRoutes');
const mediaRoutes = require('./api/journal/mediaRoutes');
const dailyQuestionsRoutes = require('./api/daily-questions/dailyQuestionsRoutes');
const supportRoutes = require('./api/support/contactRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import WebSocket service
const WebSocketService = require('./services/websocket/websocketService');

const app = express();

// Enhanced security middleware with comprehensive headers
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  // Cross-Origin policies
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS prefetch control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT header
  expectCt: {
    maxAge: 86400,
    enforce: true
  },
  
  // Feature Policy
  featurePolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'none'"],
    payment: ["'none'"]
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permissions Policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: []
  },
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // XSS Protection
  xssFilter: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Allow high-frequency fetches in development for packs and read-only GETs
    if (process.env.NODE_ENV !== 'production') {
      if (req.method === 'GET' && req.path.startsWith('/api/packs')) return true;
      if (req.method === 'GET' && req.path.startsWith('/health')) return true;
    }
    return false;
  }
});
app.use(limiter);

// CORS configuration with enhanced security
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'https://unfoldusweb.onrender.com',
          'https://datequiz.com',
          'https://www.datequiz.com'
        ]
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://[::1]:3000',
          'http://10.0.2.2:3000', // Android emulator
          'exp://192.168.1.100:19000', // Expo development
          'exp://localhost:19000', // Expo local
          'https://unfoldusweb.onrender.com' // Production fallback
        ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-New-Token',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-New-Token'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/journal', mediaRoutes);
app.use('/api/daily-questions', dailyQuestionsRoutes);
app.use('/api/support', supportRoutes);

// WebSocket endpoint info
app.get('/ws-info', (req, res) => {
  res.json({
    websocket: {
      path: '/ws',
      protocols: ['journal-chat'],
      description: 'WebSocket endpoint for real-time journal chat features'
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
