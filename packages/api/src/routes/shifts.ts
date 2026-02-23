import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

export const shiftsRouter = Router();

// Clock In
shiftsRouter.post('/clock-in', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { outletId, cashStart } = req.body;

    if (!userId || !outletId) {
      return res.status(400).json({ error: 'User ID and Outlet ID are required' });
    }

    // Check for existing active shift
    const existingShift = await prisma.shift.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (existingShift) {
      return res.status(400).json({ error: 'You already have an active shift' });
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        outletId,
        cashStart: Number(cashStart) || 0,
        startTime: new Date(),
      },
    });

    res.json(shift);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clock Out
shiftsRouter.post('/clock-out', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { cashEnd } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const activeShift = await prisma.shift.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (!activeShift) {
      return res.status(404).json({ error: 'No active shift found' });
    }

    const shift = await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        endTime: new Date(),
        cashEnd: Number(cashEnd) || 0,
      },
    });

    res.json(shift);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Current Shift Status
shiftsRouter.get('/current', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const activeShift = await prisma.shift.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: { outlet: true }
    });

    res.json(activeShift);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Shift History (Admin/Manager or Own)
shiftsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { outletId, userId, startDate, endDate } = req.query;
    const where: any = {};

    if (req.user?.role === 'CASHIER') {
      where.userId = req.user.id;
    } else {
      if (userId) where.userId = userId as string;
      if (outletId) where.outletId = outletId as string;
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 100, // Limit for performance
    });

    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
