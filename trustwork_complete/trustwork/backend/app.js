require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const { applySecurityMiddleware, safeErrorHandler, otpLimiter, paymentLimiter } = require('./src/middlewares/security');
const logger     = require('./src/config/logger');
const { Server } = require('socket.io');
const { connectDB, prisma } = require('./src/config/database');
const errorHandler = require('./src/middlewares/errorHandler');

//  Route imports 
const authRoutes         = require('./src/routes/auth');
const jobRoutes          = require('./src/routes/jobs');
const milestoneRoutes    = require('./src/routes/milestones');
const skillRoutes        = require('./src/routes/skills');
const reviewRoutes       = require('./src/routes/reviews');
const agreementRoutes    = require('./src/routes/agreements');
const notificationRoutes = require('./src/routes/notifications');
const adminRoutes        = require('./src/routes/admin');
const chatRoutes         = require('./src/routes/chat');
const matchRoutes        = require('./src/routes/match');
const paymentRoutes      = require('./src/routes/payments');
const disputeRoutes      = require('./src/routes/disputes');
const { userRouter }     = require('./src/routes/index');

const app    = express();
const server = http.createServer(app);

//  CORS 
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    callback(new Error('CORS: origin ' + origin + ' not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
applySecurityMiddleware(app);

//  Socket.io 
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  // Join a job room for real-time chat
  socket.on('join_job', (jobId) => {
    socket.join(`job:${jobId}`);
  });
  socket.on('leave_job', (jobId) => {
    socket.leave(`job:${jobId}`);
  });
  // Join a dispute room
  socket.on('join_dispute', (disputeId) => {
    socket.join(`dispute:${disputeId}`);
  });
  socket.on('disconnect', () => {});
});

//  Body parsers 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`  ${req.method.padEnd(6)} ${req.path}`);
    next();
  });
}

//  Health 
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'connected', time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
  } catch (err) {
    res.status(503).json({ status: 'ERROR', database: 'disconnected', error: err.message });
  }
});

//  Routes 
app.use('/auth/send-otp', otpLimiter);
app.use('/auth',          authRoutes);
app.use('/jobs',          jobRoutes);
app.use('/milestones',    milestoneRoutes);
app.use('/skills',        skillRoutes);
app.use('/reviews',       reviewRoutes);
app.use('/agreements',    agreementRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin',         adminRoutes);
app.use('/chat',          chatRoutes);
app.use('/match',         matchRoutes);
app.use('/payments',      paymentLimiter, paymentRoutes);
app.use('/disputes',      disputeRoutes);
app.use('/users',         userRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});
app.use(safeErrorHandler);

//  Boot 
const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`TrustWork API started`, { port: PORT, mode: process.env.NODE_ENV || 'development', frontend: process.env.FRONTEND_URL || 'http://localhost:5173' });
  });
})();

module.exports = app;
