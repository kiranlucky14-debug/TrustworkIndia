const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS = [
  // Frontend
  { name: 'React',          category: 'Frontend' },
  { name: 'Vue.js',         category: 'Frontend' },
  { name: 'Angular',        category: 'Frontend' },
  { name: 'Next.js',        category: 'Frontend' },
  { name: 'TypeScript',     category: 'Frontend' },
  { name: 'JavaScript',     category: 'Frontend' },
  { name: 'Tailwind CSS',   category: 'Frontend' },
  { name: 'HTML/CSS',       category: 'Frontend' },
  // Backend
  { name: 'Node.js',        category: 'Backend' },
  { name: 'Express.js',     category: 'Backend' },
  { name: 'Python',         category: 'Backend' },
  { name: 'Django',         category: 'Backend' },
  { name: 'FastAPI',        category: 'Backend' },
  { name: 'Java',           category: 'Backend' },
  { name: 'Spring Boot',    category: 'Backend' },
  { name: 'PHP',            category: 'Backend' },
  { name: 'Laravel',        category: 'Backend' },
  { name: 'Go',             category: 'Backend' },
  // Database
  { name: 'PostgreSQL',     category: 'Database' },
  { name: 'MySQL',          category: 'Database' },
  { name: 'MongoDB',        category: 'Database' },
  { name: 'Redis',          category: 'Database' },
  { name: 'Prisma',         category: 'Database' },
  // Mobile
  { name: 'React Native',   category: 'Mobile' },
  { name: 'Flutter',        category: 'Mobile' },
  { name: 'Android',        category: 'Mobile' },
  { name: 'iOS/Swift',      category: 'Mobile' },
  // DevOps / Cloud
  { name: 'AWS',            category: 'DevOps' },
  { name: 'Docker',         category: 'DevOps' },
  { name: 'Kubernetes',     category: 'DevOps' },
  { name: 'CI/CD',          category: 'DevOps' },
  { name: 'Linux',          category: 'DevOps' },
  // Design
  { name: 'Figma',          category: 'Design' },
  { name: 'UI/UX Design',   category: 'Design' },
  { name: 'Photoshop',      category: 'Design' },
  { name: 'Illustrator',    category: 'Design' },
  { name: 'Logo Design',    category: 'Design' },
  // Data
  { name: 'Data Analysis',  category: 'Data' },
  { name: 'Machine Learning', category: 'Data' },
  { name: 'Pandas',         category: 'Data' },
  { name: 'TensorFlow',     category: 'Data' },
  { name: 'Power BI',       category: 'Data' },
  // Marketing
  { name: 'SEO',            category: 'Marketing' },
  { name: 'Content Writing', category: 'Marketing' },
  { name: 'Social Media',   category: 'Marketing' },
  { name: 'Google Ads',     category: 'Marketing' },
  // Other
  { name: 'WordPress',      category: 'CMS' },
  { name: 'Shopify',        category: 'CMS' },
  { name: 'REST APIs',      category: 'General' },
  { name: 'GraphQL',        category: 'General' },
];

async function main() {
  console.log('Seeding skills...');
  let created = 0;
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where:  { name: skill.name },
      update: {},
      create: skill,
    });
    created++;
  }
  console.log('Done. ' + created + ' skills seeded.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
