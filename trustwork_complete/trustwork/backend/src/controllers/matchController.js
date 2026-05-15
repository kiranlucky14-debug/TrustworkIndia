// matchController.js  Smart Job Matching
// Scores each open job against a freelancer's profile (0-100)
// Factors: skill overlap, experience level, budget fit, recency

const { prisma } = require('../config/database')

//  Scoring weights 
const W = {
  SKILL_MATCH:   45,   // % of job skills matched
  EXPERIENCE:    20,   // level match
  BUDGET:        15,   // budget in their typical range
  RECENCY:       10,   // job posted recently
  COMPLETION:    10,   // past completion rate bonus
}

function scoreJob(job, freelancer, freelancerSkillNames) {
  let score = 0
  const details = {}

  // 1. Skill overlap
  const jobSkills = job.skills?.map(js => js.skill?.name?.toLowerCase()) || []
  if (jobSkills.length > 0) {
    const flNorm = freelancerSkillNames.map(s => s.toLowerCase())
    const matched = jobSkills.filter(js => flNorm.some(fs => fs.includes(js) || js.includes(fs)))
    const pct = matched.length / jobSkills.length
    const skillScore = Math.round(pct * W.SKILL_MATCH)
    score += skillScore
    details.skillMatch = { matched: matched.length, total: jobSkills.length, score: skillScore }
  } else {
    score += Math.round(W.SKILL_MATCH * 0.5) // no skills required  partial credit
    details.skillMatch = { matched: 0, total: 0, score: Math.round(W.SKILL_MATCH * 0.5) }
  }

  // 2. Experience level match
  const levelMap = { ENTRY: 1, INTERMEDIATE: 2, EXPERT: 3 }
  const flLevel  = levelMap[freelancer.experienceLevel] || 2
  const jobLevel = levelMap[job.experienceLevel]        || 2
  const levelDiff = Math.abs(flLevel - jobLevel)
  const expScore = levelDiff === 0 ? W.EXPERIENCE : levelDiff === 1 ? Math.round(W.EXPERIENCE * 0.6) : 0
  score += expScore
  details.experienceMatch = { freelancerLevel: freelancer.experienceLevel, jobLevel: job.experienceLevel, score: expScore }

  // 3. Budget fit (freelancer's hourly rate  estimated hours vs job budget)
  const hourlyRate = Number(freelancer.hourlyRate) || 0
  if (hourlyRate > 0 && job.budget > 0) {
    // Assume 40h project avg  if within 50%-200% of estimated rate  good fit
    const estimated = hourlyRate * 40
    const ratio = job.budget / estimated
    let budgetScore = 0
    if (ratio >= 0.5 && ratio <= 2) budgetScore = W.BUDGET
    else if (ratio >= 0.3 && ratio <= 3) budgetScore = Math.round(W.BUDGET * 0.6)
    score += budgetScore
    details.budgetFit = { budget: job.budget, estimated, score: budgetScore }
  } else {
    score += Math.round(W.BUDGET * 0.7) // no hourly rate set  partial
  }

  // 4. Recency (posted within last 7 days = full points)
  const ageMs   = Date.now() - new Date(job.createdAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyScore = ageDays <= 1 ? W.RECENCY : ageDays <= 3 ? Math.round(W.RECENCY * 0.8) : ageDays <= 7 ? Math.round(W.RECENCY * 0.5) : 0
  score += recencyScore
  details.recency = { ageDays: Math.round(ageDays), score: recencyScore }

  // 5. Freelancer completion rate (from trust score)
  const trustBonus = Math.round(((freelancer.trustScore || 50) / 100) * W.COMPLETION)
  score += trustBonus
  details.trustBonus = { trustScore: freelancer.trustScore, score: trustBonus }

  return { score: Math.min(100, score), details }
}

//  GET /match/jobs  top matched jobs for freelancer 
const getMatchedJobs = async (req, res) => {
  try {
    if (req.user.role !== 'FREELANCER') return res.status(403).json({ error: 'Freelancer only' })

    const freelancer = await prisma.user.findUnique({
      where:   { id: req.user.id },
      include: { skills: { include: { skill: { select: { name: true } } } } },
    })

    const skillNames = freelancer.skills.map(us => us.skill.name)

    // Fetch open jobs with skills
    const jobs = await prisma.job.findMany({
      where:   { status: 'CREATED' },
      include: {
        skills:     { include: { skill: { select: { name: true } } } },
        client:     { select: { id: true, name: true, rating: true } },
        milestones: { select: { amount: true }, take: 5 },
        _count:     { select: { applicants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    100,  // score top 100, return top 20
    })

    const scored = jobs
      .map(job => {
        const { score, details } = scoreJob(job, freelancer, skillNames)
        return { ...job, matchScore: score, matchDetails: details }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20)

    res.json({ jobs: scored, skillsUsed: skillNames.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /match/freelancers/:jobId  top freelancers for a job 
const getMatchedFreelancers = async (req, res) => {
  try {
    const { jobId } = req.params

    const job = await prisma.job.findUnique({
      where:   { id: jobId },
      include: { skills: { include: { skill: { select: { name: true } } } } },
    })
    if (!job) return res.status(404).json({ error: 'Job not found' })
    if (job.clientId !== req.user.id) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not your job' })
    }

    const jobSkillNames = job.skills.map(js => js.skill.name.toLowerCase())

    // Find freelancers with at least one matching skill
    const candidates = await prisma.user.findMany({
      where: {
        role: 'FREELANCER',
        profileCompleted: true,
        ...(jobSkillNames.length > 0 ? {
          skills: { some: { skill: { name: { in: jobSkillNames, mode: 'insensitive' } } } },
        } : {}),
      },
      include: {
        skills:  { include: { skill: { select: { name: true } } } },
        reviews: { select: { rating: true } },
        _count:  { select: { applications: true } },
      },
      take: 50,
    })

    const scored = candidates
      .map(fl => {
        const flSkills = fl.skills.map(us => us.skill.name)
        const { score } = scoreJob(
          { ...job, experienceLevel: job.experienceLevel, budget: job.budget },
          fl, flSkills
        )
        const completedCount = fl._count.applications  // approx
        return {
          id:              fl.id,
          name:            fl.name,
          rating:          fl.rating,
          ratingCount:     fl.ratingCount,
          experienceLevel: fl.experienceLevel,
          hourlyRate:      fl.hourlyRate,
          trustScore:      fl.trustScore,
          bio:             fl.bio?.slice(0, 120),
          skills:          flSkills.slice(0, 8),
          matchScore:      score,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)

    res.json({ freelancers: scored, jobTitle: job.title })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /match/dashboard  dashboard stats for freelancer 
const getDashboardMatch = async (req, res) => {
  try {
    if (req.user.role !== 'FREELANCER') return res.json({ topJobs: [], count: 0 })

    const freelancer = await prisma.user.findUnique({
      where:   { id: req.user.id },
      include: { skills: { include: { skill: { select: { name: true } } } } },
    })

    const skillNames = freelancer.skills.map(us => us.skill.name)
    if (skillNames.length === 0) return res.json({ topJobs: [], count: 0, message: 'Add skills to your profile to see matched jobs' })

    const jobs = await prisma.job.findMany({
      where:   { status: 'CREATED' },
      include: {
        skills:  { include: { skill: { select: { name: true } } } },
        client:  { select: { id: true, name: true, rating: true } },
        _count:  { select: { applicants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })

    const scored = jobs
      .map(job => ({
        ...job,
        matchScore: scoreJob(job, freelancer, skillNames).score,
      }))
      .filter(j => j.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)

    res.json({ topJobs: scored, count: scored.length, skillCount: skillNames.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getMatchedJobs, getMatchedFreelancers, getDashboardMatch }
