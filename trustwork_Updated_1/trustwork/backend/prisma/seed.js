const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding database...');

  // Create users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { phone: '9876543210' },
      update: {},
      create: { name: 'Arjun Sharma', phone: '9876543210', role: 'CLIENT', rating: 4.5, ratingCount: 8 },
    }),
    prisma.user.upsert({
      where: { phone: '9876543211' },
      update: {},
      create: { name: 'Priya Mehta', phone: '9876543211', role: 'CLIENT', rating: 4.2, ratingCount: 5 },
    }),
    prisma.user.upsert({
      where: { phone: '9876543212' },
      update: {},
      create: { name: 'Rahul Dev', phone: '9876543212', role: 'FREELANCER', rating: 4.8, ratingCount: 20 },
    }),
    prisma.user.upsert({
      where: { phone: '9876543213' },
      update: {},
      create: { name: 'Sneha Patil', phone: '9876543213', role: 'FREELANCER', rating: 4.6, ratingCount: 12 },
    }),
    prisma.user.upsert({
      where: { phone: '9876543214' },
      update: {},
      create: { name: 'Admin User', phone: '9876543214', role: 'ADMIN', rating: 0, ratingCount: 0 },
    }),
  ]);

  console.log(' Created users:', users.map(u => u.name));

  const [client1, client2, freelancer1, freelancer2] = users;

  // Create jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'React Dashboard for E-Commerce',
        description: 'Build a modern admin dashboard with charts, tables, and real-time data. Use React + Tailwind CSS.',
        budget: 25000,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'CREATED',
        clientId: client1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Node.js REST API Development',
        description: 'Develop a scalable REST API with authentication, CRUD operations, and PostgreSQL integration.',
        budget: 18000,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'CREATED',
        clientId: client1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Mobile App UI Design',
        description: 'Design a complete UI/UX for a food delivery mobile app. Figma deliverables required.',
        budget: 15000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ASSIGNED',
        clientId: client2.id,
        freelancerId: freelancer1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'WordPress Website Development',
        description: 'Create a professional business website using WordPress with custom theme and plugins.',
        budget: 12000,
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'FUNDED',
        clientId: client1.id,
        freelancerId: freelancer2.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Python Data Analysis Script',
        description: 'Write Python scripts for data cleaning, analysis, and visualization using Pandas and Matplotlib.',
        budget: 8000,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        clientId: client2.id,
        freelancerId: freelancer1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'SEO Optimization & Content Writing',
        description: 'Optimize 20 blog posts for SEO and write 5 new articles targeting specific keywords.',
        budget: 6000,
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        status: 'SUBMITTED',
        clientId: client1.id,
        freelancerId: freelancer2.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Logo Design & Brand Identity',
        description: 'Create a complete brand identity package including logo, colors, fonts, and brand guidelines.',
        budget: 9000,
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
        clientId: client2.id,
        freelancerId: freelancer1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'AWS Infrastructure Setup',
        description: 'Set up AWS infrastructure including EC2, RDS, S3, and CloudFront with proper security groups.',
        budget: 20000,
        deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        status: 'CREATED',
        clientId: client1.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Social Media Marketing Campaign',
        description: 'Plan and execute a 30-day social media campaign for Instagram, Facebook, and Twitter.',
        budget: 11000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'CREATED',
        clientId: client2.id,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Flutter Cross-Platform App',
        description: 'Build a cross-platform mobile app for iOS and Android using Flutter with Firebase backend.',
        budget: 35000,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: 'CREATED',
        clientId: client1.id,
      },
    }),
  ]);

  console.log(' Created jobs:', jobs.map(j => j.title));

  // Create escrow for funded/in-progress jobs
  const escrows = await Promise.all([
    prisma.escrow.create({
      data: {
        jobId: jobs[3].id,
        amount: 12000,
        status: 'LOCKED',
        paymentId: 'pay_mock_001',
        orderId: 'order_mock_001',
      },
    }),
    prisma.escrow.create({
      data: {
        jobId: jobs[4].id,
        amount: 8000,
        status: 'LOCKED',
        paymentId: 'pay_mock_002',
        orderId: 'order_mock_002',
      },
    }),
    prisma.escrow.create({
      data: {
        jobId: jobs[5].id,
        amount: 6000,
        status: 'LOCKED',
        paymentId: 'pay_mock_003',
        orderId: 'order_mock_003',
      },
    }),
    prisma.escrow.create({
      data: {
        jobId: jobs[6].id,
        amount: 9000,
        status: 'RELEASED',
        paymentId: 'pay_mock_004',
        orderId: 'order_mock_004',
      },
    }),
  ]);

  console.log(' Created escrows:', escrows.length);
  console.log('\n Seed complete!');
  console.log('\n Test OTP login with these numbers:');
  console.log('  CLIENT:     9876543210 (Arjun Sharma)');
  console.log('  CLIENT:     9876543211 (Priya Mehta)');
  console.log('  FREELANCER: 9876543212 (Rahul Dev)');
  console.log('  FREELANCER: 9876543213 (Sneha Patil)');
  console.log('  ADMIN:      9876543214 (Admin User)');
  console.log('  OTP for all: 123456');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

//  Milestone seed (appended) 
async function seedMilestones() {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();

  // Pick the first CREATED job that belongs to client u1
  const job = await p.job.findFirst({
    where: { status: 'CREATED' },
    orderBy: { createdAt: 'desc' },
  });
  if (!job) { console.log('No CREATED job found for milestone seed'); return; }

  // Delete old milestones for this job if any
  await p.milestone.deleteMany({ where: { jobId: job.id } });

  const milestones = await Promise.all([
    p.milestone.create({ data: { jobId: job.id, title: 'UI Wireframes', amount: job.budget * 0.25, order: 1, status: 'PENDING' } }),
    p.milestone.create({ data: { jobId: job.id, title: 'Frontend Build', amount: job.budget * 0.50, order: 2, status: 'PENDING' } }),
    p.milestone.create({ data: { jobId: job.id, title: 'Final Delivery & QA', amount: job.budget * 0.25, order: 3, status: 'PENDING' } }),
  ]);

  // Update job budget to sum of milestones
  const total = milestones.reduce((s, m) => s + m.amount, 0);
  await p.job.update({ where: { id: job.id }, data: { budget: total } });

  console.log(` Created ${milestones.length} milestones for job: "${job.title}"`);
  await p.$disconnect();
}

seedMilestones().catch(e => { console.error('Milestone seed error:', e.message); });
