import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

export const guidesRouter = Router();

// Get all guides
guidesRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { outletId } = req.query;
    
    const guides = await prisma.guide.findMany({
      where: {
        isActive: true,
        ...(outletId && { outletId: outletId as string }),
      },
      include: {
        commissions: true
      },
      orderBy: { name: 'asc' },
    });
    
    // Calculate total unpaid commission per guide
    const guidesWithCommission = guides.map(guide => {
        const unpaidCommission = guide.commissions
            .filter(c => !c.isPaid)
            .reduce((sum, c) => sum + c.amount, 0);
        
        return {
            ...guide,
            unpaidCommission
        };
    });

    res.json(guidesWithCommission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
