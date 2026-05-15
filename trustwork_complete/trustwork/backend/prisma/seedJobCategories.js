// seedJobCategories.js
// Safe, idempotent seed for TrustWork Job Categories + Skills from the Excel sheet.
// Rules:
//   - Normalise names before comparison (lowercase + trim + collapse spaces)
//   - If skill (name) already exists under ANY category  skip (log)
//   - If skill exists but under a different category  skip with warning
//   - Only insert genuinely new skills
//   - Never modify existing records
//   - Uses DB transactions for safety
//   - Detailed console log: inserted / skipped / errors

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//  Normalisation helpers 
const norm = s => s?.toString().toLowerCase().replace(/\s+/g, ' ').trim() || '';

// Canonical skill name  applies light normalisation for display
const canonical = s => s.toString().trim().replace(/\s+/g, ' ');

// Canonical category name
const canonicalCat = s => s.toString().trim().replace(/\s+/g, ' ');

//  Data from Excel (TrustWork_Job_Categories.xlsx) 
// 102 jobs across 12 categories  all manually transcribed with canonical casing
const EXCEL_DATA = [
  //  Tech & Software Development (18) 
  { category: 'Tech & Software Development', skill: 'Frontend Developer' },
  { category: 'Tech & Software Development', skill: 'Backend Developer' },
  { category: 'Tech & Software Development', skill: 'Full-stack Developer' },
  { category: 'Tech & Software Development', skill: 'React Developer' },
  { category: 'Tech & Software Development', skill: 'Node.js Developer' },
  { category: 'Tech & Software Development', skill: 'Python Developer' },
  { category: 'Tech & Software Development', skill: 'Java Developer' },
  { category: 'Tech & Software Development', skill: 'Mobile App Developer' },
  { category: 'Tech & Software Development', skill: 'Flutter Developer' },
  { category: 'Tech & Software Development', skill: 'AI/ML Developer' },
  { category: 'Tech & Software Development', skill: 'SaaS Developer' },
  { category: 'Tech & Software Development', skill: 'WordPress Developer' },
  { category: 'Tech & Software Development', skill: 'Shopify Developer' },
  { category: 'Tech & Software Development', skill: 'API Integration Specialist' },
  { category: 'Tech & Software Development', skill: 'DevOps Engineer' },
  { category: 'Tech & Software Development', skill: 'QA Tester' },
  { category: 'Tech & Software Development', skill: 'UI Developer' },
  { category: 'Tech & Software Development', skill: 'Blockchain Developer' },
  //  Design & Creative (11) 
  { category: 'Design & Creative', skill: 'UI/UX Designer' },
  { category: 'Design & Creative', skill: 'Graphic Designer' },
  { category: 'Design & Creative', skill: 'Logo Designer' },
  { category: 'Design & Creative', skill: 'Brand Identity Designer' },
  { category: 'Design & Creative', skill: 'Thumbnail Designer' },
  { category: 'Design & Creative', skill: 'Motion Graphics Designer' },
  { category: 'Design & Creative', skill: 'Video Editor' },
  { category: 'Design & Creative', skill: 'Animator' },
  { category: 'Design & Creative', skill: '3D Artist' },
  { category: 'Design & Creative', skill: 'Presentation Designer' },
  { category: 'Design & Creative', skill: 'Product Designer' },
  //  AI & Automation (8) 
  { category: 'AI & Automation', skill: 'AI Chatbot Developer' },
  { category: 'AI & Automation', skill: 'AI Automation Expert' },
  { category: 'AI & Automation', skill: 'Workflow Automation Specialist' },
  { category: 'AI & Automation', skill: 'Prompt Engineer' },
  { category: 'AI & Automation', skill: 'AI Content Creator' },
  { category: 'AI & Automation', skill: 'AI Voice Assistant Builder' },
  { category: 'AI & Automation', skill: 'OpenAI Integration Developer' },
  { category: 'AI & Automation', skill: 'AI Agent Developer' },
  //  Digital Marketing (10) 
  { category: 'Digital Marketing', skill: 'Social Media Manager' },
  { category: 'Digital Marketing', skill: 'Instagram Marketer' },
  { category: 'Digital Marketing', skill: 'Facebook Ads Expert' },
  { category: 'Digital Marketing', skill: 'Google Ads Expert' },
  { category: 'Digital Marketing', skill: 'SEO Specialist' },
  { category: 'Digital Marketing', skill: 'Content Marketer' },
  { category: 'Digital Marketing', skill: 'Email Marketer' },
  { category: 'Digital Marketing', skill: 'Lead Generation Expert' },
  { category: 'Digital Marketing', skill: 'Influencer Marketing Specialist' },
  { category: 'Digital Marketing', skill: 'Brand Strategist' },
  //  Writing & Content (10) 
  { category: 'Writing & Content', skill: 'Copywriter' },
  { category: 'Writing & Content', skill: 'Blog Writer' },
  { category: 'Writing & Content', skill: 'Technical Writer' },
  { category: 'Writing & Content', skill: 'Ghostwriter' },
  { category: 'Writing & Content', skill: 'Script Writer' },
  { category: 'Writing & Content', skill: 'Resume Writer' },
  { category: 'Writing & Content', skill: 'LinkedIn Profile Writer' },
  { category: 'Writing & Content', skill: 'Product Description Writer' },
  { category: 'Writing & Content', skill: 'Proofreader' },
  { category: 'Writing & Content', skill: 'Translator' },
  //  Business & Consulting (8) 
  { category: 'Business & Consulting', skill: 'Business Consultant' },
  { category: 'Business & Consulting', skill: 'Startup Advisor' },
  { category: 'Business & Consulting', skill: 'HR Consultant' },
  { category: 'Business & Consulting', skill: 'Recruitment Specialist' },
  { category: 'Business & Consulting', skill: 'Financial Consultant' },
  { category: 'Business & Consulting', skill: 'Tax Consultant' },
  { category: 'Business & Consulting', skill: 'Pitch Deck Consultant' },
  { category: 'Business & Consulting', skill: 'Operations Consultant' },
  //  Video & Media (7) 
  { category: 'Video & Media', skill: 'Reels Editor' },
  { category: 'Video & Media', skill: 'YouTube Editor' },
  { category: 'Video & Media', skill: 'Podcast Editor' },
  { category: 'Video & Media', skill: 'Cinematic Editor' },
  { category: 'Video & Media', skill: 'Subtitle Creator' },
  { category: 'Video & Media', skill: 'Voice-over Artist' },
  { category: 'Video & Media', skill: 'Audio Editor' },
  //  Sales & Customer Support (6) 
  { category: 'Sales & Customer Support', skill: 'Appointment Setter' },
  { category: 'Sales & Customer Support', skill: 'Sales Closer' },
  { category: 'Sales & Customer Support', skill: 'Customer Support Agent' },
  { category: 'Sales & Customer Support', skill: 'Virtual Assistant' },
  { category: 'Sales & Customer Support', skill: 'Chat Support Executive' },
  { category: 'Sales & Customer Support', skill: 'CRM Specialist' },
  //  Education & Coaching (8) 
  { category: 'Education & Coaching', skill: 'Coding Mentor' },
  { category: 'Education & Coaching', skill: 'English Trainer' },
  { category: 'Education & Coaching', skill: 'Fitness Coach' },
  { category: 'Education & Coaching', skill: 'Career Coach' },
  { category: 'Education & Coaching', skill: 'Business Mentor' },
  { category: 'Education & Coaching', skill: 'Stock Market Trainer' },
  { category: 'Education & Coaching', skill: 'AI Trainer' },
  { category: 'Education & Coaching', skill: 'Interview Coach' },
  //  Architecture & Engineering (5) 
  { category: 'Architecture & Engineering', skill: 'Architect' },
  { category: 'Architecture & Engineering', skill: 'CAD Designer' },
  { category: 'Architecture & Engineering', skill: 'Interior Designer' },
  { category: 'Architecture & Engineering', skill: 'Civil Design Consultant' },
  { category: 'Architecture & Engineering', skill: 'Mechanical Designer' },
  //  E-commerce Services (5) 
  { category: 'E-commerce Services', skill: 'Shopify Expert' },
  { category: 'E-commerce Services', skill: 'Amazon Listing Specialist' },
  { category: 'E-commerce Services', skill: 'Product Sourcing Expert' },
  { category: 'E-commerce Services', skill: 'Dropshipping Manager' },
  { category: 'E-commerce Services', skill: 'Ecommerce Marketing Specialist' },
  //  Local Skilled Services (6) 
  { category: 'Local Skilled Services', skill: 'Photographer' },
  { category: 'Local Skilled Services', skill: 'Videographer' },
  { category: 'Local Skilled Services', skill: 'Event Planner' },
  { category: 'Local Skilled Services', skill: 'Makeup Artist' },
  { category: 'Local Skilled Services', skill: 'Wedding Editor' },
  { category: 'Local Skilled Services', skill: 'Home Tutor' },
]

//  Main 
async function main() {
  console.log('\n')
  console.log(  '  TrustWork Job Categories Seed  (Idempotent)     ')
  console.log(  '\n')

  // Step 1: Load all existing skills from DB
  const existingRaw = await prisma.skill.findMany({
    select: { id: true, name: true, category: true },
  })
  console.log(` Existing skills in DB: ${existingRaw.length}`)

  // Build normalised lookup: normName -> { id, name, category }
  const existingByNorm = new Map()
  for (const s of existingRaw) {
    existingByNorm.set(norm(s.name), s)
  }

  // Step 2: Analyse what exists already (categories as strings)
  const existingCats = new Set(existingRaw.map(s => norm(s.category)))
  console.log(` Existing category strings: ${existingCats.size}`)
  console.log('   ', [...existingCats].join(', ') || '(none)')
  console.log()

  // Step 3: Plan insertions
  const toInsert  = []  // { name, category }
  const skipped   = []  // { skill, category, reason }
  const warnings  = []  // { skill, existingCat, newCat }

  for (const { category, skill } of EXCEL_DATA) {
    const normSkill = norm(skill)
    const normCat   = norm(category)

    if (existingByNorm.has(normSkill)) {
      const existing = existingByNorm.get(normSkill)
      if (norm(existing.category) === normCat) {
        skipped.push({ skill, category, reason: 'EXACT DUPLICATE (same name, same category)' })
      } else {
        skipped.push({ skill, category, reason: `EXISTS under different category: "${existing.category}"` })
        warnings.push({ skill, existingCat: existing.category, newCat: category })
      }
    } else {
      toInsert.push({
        name:     canonical(skill),
        category: canonicalCat(category),
      })
      // Add to lookup so duplicates within the Excel file are also caught
      existingByNorm.set(normSkill, { name: canonical(skill), category: canonicalCat(category) })
    }
  }

  // Step 4: Log plan
  console.log(` New skills to insert:  ${toInsert.length}`)
  console.log(`  Skills to skip:        ${skipped.length}`)
  if (warnings.length > 0) {
    console.log(`  Category mismatches:   ${warnings.length}`)
  }

  // Step 5: Log skipped details
  if (skipped.length > 0) {
    console.log('\n SKIPPED (duplicate detection) ')
    for (const s of skipped) {
      console.log(`  SKIP  [${s.category}] "${s.skill}"`)
      console.log(`        Reason: ${s.reason}`)
    }
  }

  // Step 6: Log category-mismatch warnings
  if (warnings.length > 0) {
    console.log('\n CATEGORY MISMATCH WARNINGS ')
    for (const w of warnings) {
      console.log(`  WARN  "${w.skill}"`)
      console.log(`        Exists in: "${w.existingCat}"`)
      console.log(`        Excel has: "${w.newCat}"`)
      console.log(`         Skipped. Update manually if intentional.`)
    }
  }

  // Step 7: Insert new skills inside a transaction
  if (toInsert.length === 0) {
    console.log('\n Nothing to insert  database is already up to date.\n')
    return
  }

  console.log('\n INSERTING NEW SKILLS ')

  // Group by category for cleaner log output
  const byNewCat = {}
  for (const s of toInsert) {
    if (!byNewCat[s.category]) byNewCat[s.category] = []
    byNewCat[s.category].push(s.name)
  }

  // Show what NEW categories will be created
  const incomingCats = new Set(toInsert.map(s => norm(s.category)))
  const newCatNames  = [...incomingCats].filter(nc => !existingCats.has(nc))
  if (newCatNames.length > 0) {
    console.log(`   New categories (strings) being introduced:`)
    for (const nc of newCatNames) {
      const display = toInsert.find(s => norm(s.category) === nc)?.category
      console.log(`     + "${display}"`)
    }
  }

  // Show per-category insertions
  for (const [cat, skills] of Object.entries(byNewCat)) {
    const isNewCat = newCatNames.includes(norm(cat))
    console.log(`\n  ${isNewCat ? '' : ''} [${cat}]  ${skills.length} new skill(s)`)
    for (const sk of skills) console.log(`     + "${sk}"`)
  }

  // Batch insert via transaction
  let inserted = 0
  let failed   = 0

  await prisma.$transaction(async (tx) => {
    for (const skill of toInsert) {
      try {
        await tx.skill.create({ data: { name: skill.name, category: skill.category } })
        inserted++
      } catch (err) {
        // Guard against race conditions or unique constraint violations
        if (err.code === 'P2002') {
          console.warn(`  RACE  "${skill.name}"  unique constraint on insert (skipping)`)
          failed++
        } else {
          throw err  // re-throw unexpected errors to roll back transaction
        }
      }
    }
  })

  // Step 8: Summary
  console.log('\n')
  console.log(  '  SEED COMPLETE  SUMMARY              ')
  console.log(  '')
  console.log(`    Inserted:           ${inserted}`)
  console.log(`     Skipped (duplicate): ${skipped.length}`)
  console.log(`    Failed (constraint): ${failed}`)
  console.log(`    Total in Excel:      ${EXCEL_DATA.length}`)
  console.log(  '\n')

  // Final DB count
  const finalCount = await prisma.skill.count()
  console.log(`  DB skill total (after): ${finalCount}\n`)
}

main()
  .catch(err => {
    console.error('\n Fatal error during seed:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
