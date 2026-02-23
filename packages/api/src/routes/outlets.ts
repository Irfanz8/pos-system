import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

export const outletsRouter = Router();

// Get all outlets
outletsRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const outlets = await prisma.outlet.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create outlet (Admin only)
outletsRouter.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, address, phone, isHeadquarters } = req.body;

    // If setting as HQ, unset others
    if (isHeadquarters) {
      await prisma.outlet.updateMany({
        where: { isHeadquarters: true },
        data: { isHeadquarters: false },
      });
    }

    const outlet = await prisma.outlet.create({
      data: { name, address, phone, isHeadquarters },
    });

    res.json(outlet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update outlet
outletsRouter.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, isHeadquarters } = req.body;

    if (isHeadquarters) {
       await prisma.outlet.updateMany({
         where: { isHeadquarters: true, id: { not: id } },
         data: { isHeadquarters: false },
       });
    }

    const outlet = await prisma.outlet.update({
      where: { id },
      data: { name, address, phone, isHeadquarters },
    });

    res.json(outlet);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete outlet
outletsRouter.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if has dependencies
    const hasUsers = await prisma.user.count({ where: { outletId: id } });
    if (hasUsers > 0) return res.status(400).json({ error: 'Cannot delete outlet with users' });

    await prisma.outlet.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
