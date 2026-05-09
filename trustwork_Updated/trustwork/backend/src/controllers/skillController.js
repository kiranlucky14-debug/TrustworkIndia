const { prisma } = require('../config/database');

// GET /skills?q=react  -- autocomplete + full list
const getSkills = async (req, res) => {
  try {
    const { q, category } = req.query;
    const where = {};
    if (q)        where.name     = { contains: q, mode: 'insensitive' };
    if (category) where.category = category;

    const skills = await prisma.skill.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /skills/categories  -- distinct category list
const getCategories = async (req, res) => {
  try {
    const rows = await prisma.skill.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json(rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /users/me/skills  body: { skillIds: ['id1','id2'] }
const setMySkills = async (req, res) => {
  try {
    const { skillIds } = req.body;
    if (!Array.isArray(skillIds))
      return res.status(400).json({ error: 'skillIds must be an array' });

    // Validate all IDs exist
    const found = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true },
    });
    if (found.length !== skillIds.length)
      return res.status(400).json({ error: 'One or more skill IDs are invalid' });

    await prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId: req.user.id } }),
      ...skillIds.map(skillId =>
        prisma.userSkill.create({ data: { userId: req.user.id, skillId } })
      ),
    ]);

    const skills = await prisma.skill.findMany({
      where: { userSkills: { some: { userId: req.user.id } } },
      orderBy: { name: 'asc' },
    });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /users/:id/skills
const getUserSkills = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { userSkills: { some: { userId: req.params.id } } },
      orderBy: { name: 'asc' },
    });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /jobs/:id/skills  body: { skillIds: ['id1','id2'] }
const setJobSkills = async (req, res) => {
  try {
    const { skillIds } = req.body;
    if (!Array.isArray(skillIds))
      return res.status(400).json({ error: 'skillIds must be an array' });

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id)
      return res.status(403).json({ error: 'Not your job' });

    const found = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true },
    });
    if (found.length !== skillIds.length)
      return res.status(400).json({ error: 'One or more skill IDs are invalid' });

    await prisma.$transaction([
      prisma.jobSkill.deleteMany({ where: { jobId: req.params.id } }),
      ...skillIds.map(skillId =>
        prisma.jobSkill.create({ data: { jobId: req.params.id, skillId } })
      ),
    ]);

    const skills = await prisma.skill.findMany({
      where: { jobSkills: { some: { jobId: req.params.id } } },
      orderBy: { name: 'asc' },
    });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /jobs/:id/skills
const getJobSkills = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { jobSkills: { some: { jobId: req.params.id } } },
      orderBy: { name: 'asc' },
    });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getSkills, getCategories, setMySkills, getUserSkills, setJobSkills, getJobSkills };
