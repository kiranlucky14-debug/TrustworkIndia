const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
});

/**
 * Test the database connection.
 * Called once on server startup. Process exits on failure.
 */
async function connectDB() {
  try {
    await prisma.$connect();
    // Run a lightweight query to verify the connection is truly alive
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('\n📋 Troubleshooting:');
    console.error('   1. Is PostgreSQL running?  →  pg_isready -h localhost -p 5432');
    console.error('   2. Does the database exist? →  psql -U postgres -c "\\l"');
    console.error('   3. Check DATABASE_URL in backend/.env');
    console.error('   4. Run migrations: npx prisma migrate dev\n');
    process.exit(1);
  }
}

/**
 * Gracefully disconnect Prisma on shutdown signals.
 */
async function disconnectDB() {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
}

process.on('SIGINT',  async () => { await disconnectDB(); process.exit(0); });
process.on('SIGTERM', async () => { await disconnectDB(); process.exit(0); });

module.exports = { prisma, connectDB, disconnectDB };
