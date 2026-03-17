const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerBidHandlers } = require('./bidSocket');
const { registerAuctionHandlers } = require('./auctionSocket');

const initSocketHandlers = (io) => {
  // ── Auth middleware for sockets ──────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.user = null;
        return next();  // Allow unauthenticated (read-only)
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name avatar role');
      socket.user = user;
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | user: ${socket.user?.name || 'guest'}`);

    // Register handlers
    registerBidHandlers(io, socket);
    registerAuctionHandlers(io, socket);

    // ── Join auction room ──────────────────────────────────
    socket.on('auction:join', ({ auctionId }) => {
      socket.join(`auction:${auctionId}`);
      socket.emit('auction:joined', { auctionId });
      console.log(`👥 ${socket.user?.name || 'guest'} joined auction:${auctionId}`);
    });

    // ── Leave auction room ─────────────────────────────────
    socket.on('auction:leave', ({ auctionId }) => {
      socket.leave(`auction:${auctionId}`);
    });

    // ── Ping/pong heartbeat ────────────────────────────────
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | reason: ${reason}`);
    });
  });
};

module.exports = { initSocketHandlers };
