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

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit for bid placement
const bidLimiter = rateLimit({
  windowMs: 1000,     // 1 second
  max: 5,
  message: { error: 'Bid rate limit exceeded.' },
});
app.use('/api/bids', bidLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);


// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});
// app.use ke baad, routes se pehle

// ─── Boot ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await connectRedis();
  initSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`\n🚀 BidSphere Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}\n`);
  });
};
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED:', err.message);
});
start();
