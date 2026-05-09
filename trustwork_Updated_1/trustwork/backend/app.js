require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { connectDB, prisma } = require('./src/config/database');
const errorHandler = require('./src/middlewares/errorHandler');
const authRoutes       = require('./src/routes/auth');
const jobRoutes        = require('./src/routes/jobs');
const milestoneRoutes  = require('./src/routes/milestones');
const skillRoutes      = require('./src/routes/skills');
const reviewRoutes     = require('./src/routes/reviews');
const { escrowRouter, paymentRouter, disputeRouter, userRouter } =
  require('./src/routes/index');

const app = express();

//  Middleware 
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
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
app.use('/auth',        authRoutes);
app.use('/jobs',        jobRoutes);
app.use('/milestones',  milestoneRoutes);
app.use('/skills',      skillRoutes);
app.use('/reviews',     reviewRoutes);   //  NEW
app.use('/escrow',      escrowRouter);
app.use('/payments',    paymentRouter);
app.use('/disputes',    disputeRouter);
app.use('/users',       userRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});
app.use(errorHandler);

//  Boot 
const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n TrustWork API    http://localhost:${PORT}`);
    console.log(` Health check     http://localhost:${PORT}/health`);
    console.log(` Mode             ${process.env.NODE_ENV || 'development'}`);
    console.log(` Frontend CORS    ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
  });
})();

module.exports = app;
