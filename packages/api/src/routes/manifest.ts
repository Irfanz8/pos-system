import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

export const manifestRouter = Router();

// Get daily manifest
manifestRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, outletId } = req.query; // format: YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(outletId && { 
            activityPackage: { outletId: outletId as string }
        }),
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
          activityPackage: true,
          sessionTime: true,
          participants: true,
          guide: true,
      },
      orderBy: {
          sessionTime: { startTime: 'asc' }
      }
    });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
