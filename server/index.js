require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const connectRedis = require('./src/config/redis');
const { initSocketHandlers } = require('./src/sockets');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const auctionRoutes = require('./src/routes/auction.routes');
const bidRoutes = require('./src/routes/bid.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const adminRoutes = require('./src/routes/admin.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting — relaxed for development ─────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 2000,                  // 2000 requests per 15 min (was 200)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in dev
    const ip = req.ip || '';
    return ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost');
  },
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Bid limiter — relaxed
const bidLimiter = rateLimit({
  windowMs: 5000,   // 5 seconds window (was 1 second)
  max: 20,          // 20 bids per 5 sec (was 5 per 1 sec)
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '::1' || ip === '127.0.0.1';
  },
  message: { error: 'Bid rate limit exceeded. Please wait a moment.' },
});
app.use('/api/bids', bidLimiter);

// AI routes — very relaxed (predictions refresh often)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '::1' || ip === '127.0.0.1';
  },
});
app.use('/api/ai', aiLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids',     bidRoutes);
app.use('/api/wallet',   walletRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/ai',       aiRoutes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date().toISOString(),
  uptime: Math.floor(process.uptime()) + 's',
}));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await connectRedis();
  initSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`\n🚀 BidSphere Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`⚡ Rate limiting: RELAXED for development\n`);
  });
};

start();