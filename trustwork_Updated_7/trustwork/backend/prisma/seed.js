const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Demo users - profileCompleted: true so they go straight to dashboard
  const users = await Promise.all([
    prisma.user.upsert({
      where:  { phone: '9876543210' },
      update: { profileCompleted: true },
      create: {
        name: 'Arjun Sharma', phone: '9876543210', role: 'CLIENT',
        rating: 4.5, ratingCount: 8,
        email: 'arjun@example.com', city: 'Mumbai', state: 'Maharashtra',
        designation: 'Founder', companyName: 'Arjun Ventures',
        businessType: 'Private Limited', profileCompleted: true,
      },
    }),
    prisma.user.upsert({
      where:  { phone: '9876543211' },
      update: { profileCompleted: true },
      create: {
        name: 'Priya Mehta', phone: '9876543211', role: 'CLIENT',
        rating: 4.2, ratingCount: 5,
        email: 'priya@example.com', city: 'Delhi', state: 'Delhi',
        designation: 'CEO', companyName: 'Mehta Corp',
        businessType: 'LLP', profileCompleted: true,
      },
    }),
    prisma.user.upsert({
      where:  { phone: '9876543212' },
      update: { profileCompleted: true },
      create: {
        name: 'Rahul Dev', phone: '9876543212', role: 'FREELANCER',
        rating: 4.8, ratingCount: 20,
        email: 'rahul@example.com', city: 'Bengaluru', state: 'Karnataka',
        title: 'Full Stack Developer', experienceLevel: 'Advanced (5-8 years)',
        yearsOfExperience: 6, bio: 'Full stack developer with 6 years of experience in React, Node.js, and PostgreSQL. Passionate about building scalable web applications.',
        profileCompleted: true,
      },
    }),
    prisma.user.upsert({
      where:  { phone: '9876543213' },
      update: { profileCompleted: true },
      create: {
        name: 'Sneha Patil', phone: '9876543213', role: 'FREELANCER',
        rating: 4.6, ratingCount: 12,
        email: 'sneha@example.com', city: 'Pune', state: 'Maharashtra',
        title: 'UI/UX Designer', experienceLevel: 'Intermediate (2-4 years)',
        yearsOfExperience: 3, bio: 'Creative UI/UX designer with expertise in Figma, user research, and design systems. Love creating beautiful and functional interfaces.',
        profileCompleted: true,
      },
    }),
    prisma.user.upsert({
      where:  { phone: '9876543214' },
      update: { profileCompleted: true },
      create: {
        name: 'Admin User', phone: '9876543214', role: 'ADMIN',
        rating: 0, ratingCount: 0, profileCompleted: true,
        email: 'admin@trustwork.in',
      },
    }),
  ]);

  console.log('Created/updated users:', users.map(u => u.name));
  const [client1, client2, freelancer1, freelancer2] = users;

  // Jobs
  const jobs = await Promise.all([
    prisma.job.create({ data: { title: 'React Dashboard for E-Commerce', description: 'Build a modern admin dashboard with charts, tables, and real-time data. Use React + Tailwind CSS.', budget: 25000, deadline: new Date(Date.now() + 14*86400000), status: 'CREATED', clientId: client1.id } }),
    prisma.job.create({ data: { title: 'Node.js REST API Development', description: 'Develop a scalable REST API with authentication, CRUD operations, and PostgreSQL integration.', budget: 18000, deadline: new Date(Date.now() + 10*86400000), status: 'CREATED', clientId: client1.id } }),
    prisma.job.create({ data: { title: 'Mobile App UI Design', description: 'Design a complete UI/UX for a food delivery mobile app. Figma deliverables required.', budget: 15000, deadline: new Date(Date.now() + 7*86400000), status: 'ASSIGNED', clientId: client2.id, freelancerId: freelancer1.id } }),
    prisma.job.create({ data: { title: 'WordPress Website Development', description: 'Create a professional business website using WordPress with custom theme and plugins.', budget: 12000, deadline: new Date(Date.now() + 21*86400000), status: 'FUNDED', clientId: client1.id, freelancerId: freelancer2.id } }),
    prisma.job.create({ data: { title: 'Python Data Analysis Script', description: 'Write Python scripts for data cleaning, analysis, and visualization using Pandas and Matplotlib.', budget: 8000, deadline: new Date(Date.now() + 5*86400000), status: 'IN_PROGRESS', clientId: client2.id, freelancerId: freelancer1.id } }),
    prisma.job.create({ data: { title: 'SEO Optimization & Content Writing', description: 'Optimize 20 blog posts for SEO and write 5 new articles targeting specific keywords.', budget: 6000, deadline: new Date(Date.now() + 12*86400000), status: 'SUBMITTED', clientId: client1.id, freelancerId: freelancer2.id } }),
    prisma.job.create({ data: { title: 'Logo Design & Brand Identity', description: 'Create a complete brand identity package including logo, colors, fonts, and brand guidelines.', budget: 9000, deadline: new Date(Date.now() - 2*86400000), status: 'COMPLETED', clientId: client2.id, freelancerId: freelancer1.id } }),
    prisma.job.create({ data: { title: 'AWS Infrastructure Setup', description: 'Set up AWS infrastructure including EC2, RDS, S3, and CloudFront with proper security groups.', budget: 20000, deadline: new Date(Date.now() + 18*86400000), status: 'CREATED', clientId: client1.id } }),
    prisma.job.create({ data: { title: 'Social Media Marketing Campaign', description: 'Plan and execute a 30-day social media campaign for Instagram, Facebook, and Twitter.', budget: 11000, deadline: new Date(Date.now() + 30*86400000), status: 'CREATED', clientId: client2.id } }),
    prisma.job.create({ data: { title: 'Flutter Cross-Platform App', description: 'Build a cross-platform mobile app for iOS and Android using Flutter with Firebase backend.', budget: 35000, deadline: new Date(Date.now() + 45*86400000), status: 'CREATED', clientId: client1.id } }),
  ]);
  console.log('Created jobs:', jobs.length);

  // Escrows
  await Promise.all([
    prisma.escrow.create({ data: { jobId: jobs[3].id, amount: 12000, status: 'LOCKED',   paymentId: 'pay_mock_001', orderId: 'order_mock_001' } }),
    prisma.escrow.create({ data: { jobId: jobs[4].id, amount: 8000,  status: 'LOCKED',   paymentId: 'pay_mock_002', orderId: 'order_mock_002' } }),
    prisma.escrow.create({ data: { jobId: jobs[5].id, amount: 6000,  status: 'LOCKED',   paymentId: 'pay_mock_003', orderId: 'order_mock_003' } }),
    prisma.escrow.create({ data: { jobId: jobs[6].id, amount: 9000,  status: 'RELEASED', paymentId: 'pay_mock_004', orderId: 'order_mock_004' } }),
  ]);
  console.log('Created escrows: 4');

  console.log('\nSeed complete!');
  console.log('\nDemo login credentials (OTP: 123456):');
  console.log('  CLIENT:     9876543210  Arjun Sharma');
  console.log('  CLIENT:     9876543211  Priya Mehta');
  console.log('  FREELANCER: 9876543212  Rahul Dev');
  console.log('  FREELANCER: 9876543213  Sneha Patil');
  console.log('  ADMIN:      9876543214  Admin User');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
