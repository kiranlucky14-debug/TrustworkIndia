const { prisma } = require('../config/database');

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id || req.user.id },
      select: {
        id: true, name: true, phone: true, role: true,
        rating: true, ratingCount: true, createdAt: true,
        _count: { select: { clientJobs: true, freelancerJobs: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: { id: true, name: true, phone: true, role: true, rating: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const rateUser = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newRating = (user.rating * user.ratingCount + rating) / (user.ratingCount + 1);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { rating: newRating, ratingCount: { increment: 1 } },
      select: { id: true, name: true, rating: true, ratingCount: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProfile, updateProfile, rateUser };
