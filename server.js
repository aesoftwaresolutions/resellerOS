// src/server.js
require('express-async-errors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { initWebSocket, emitToUser } = require('./websocket');
const { initScheduler } = require('./jobs/scheduler');
const SyncBridge = require('./services/sync/SyncBridge');

const app = express();
const server = http.createServer(app);

// ========================
// MIDDLEWARE
// ========================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.app.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
if (config.app.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(`/api/${config.app.apiVersion}`, limiter);

// ========================
// ROUTES
// ========================
app.use(`/api/${config.app.apiVersion}`, routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.apiVersion,
    status: 'running',
    docs: `/api/${config.app.apiVersion}/docs`,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ========================
// START SERVER
// ========================
const PORT = config.app.port;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`
  ╔══════════════════════════════════════════════╗
  ║    ${config.app.name} API Server             ║
  ║    Port: ${PORT}                              ║
  ║    Env:  ${config.app.env}                        ║
  ║    API:  /api/${config.app.apiVersion}                          ║
  ╚══════════════════════════════════════════════╝
  `);

  // Initialize WebSocket
  if (config.websocket.enabled) {
    initWebSocket(server);
  }

  // Initialize background job scheduler
  if (config.app.env !== 'test') {
    initScheduler();
  }

  // Initialize SyncBridge (Supabase Realtime + Google Sheets)
  SyncBridge.initialize(emitToUser).catch(err => {
    logger.warn('SyncBridge init warning:', err.message);
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app; // for testing
