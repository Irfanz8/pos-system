import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

export const activitiesRouter = Router();

// Get all activity packages
activitiesRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { outletId } = req.query;
    
    const packages = await prisma.activityPackage.findMany({
      where: {
        isActive: true,
        ...(outletId && { outletId: outletId as string }),
      },
      include: {
        sessions: {
          where: { isActive: true },
        },
        addons: {
          include: { product: true }
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(packages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new activity package
activitiesRouter.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, basePrice, childPrice, maxCapacity, minPax, durationMinutes, outletId } = req.body;
    
    if (!name || !basePrice || !maxCapacity || !durationMinutes || !outletId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newPackage = await prisma.activityPackage.create({
      data: {
        name,
        description,
        basePrice: Number(basePrice),
        childPrice: childPrice ? Number(childPrice) : null,
        maxCapacity: Number(maxCapacity),
        minPax: minPax ? Number(minPax) : 1,
        durationMinutes: Number(durationMinutes),
        outletId,
        isActive: true,
      }
    });

    res.status(201).json(newPackage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create activity package' });
  }
});

// Check availability for a specific date & calculate dynamic prices
activitiesRouter.get('/:id/availability', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // format: YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const activity = await prisma.activityPackage.findUnique({
      where: { id },
      include: {
        sessions: { where: { isActive: true } },
        dynamicPricingRules: {
          where: { isActive: true }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    let currentPrice = activity.basePrice;
    let currentChildPrice = activity.childPrice || activity.basePrice;
    const targetDate = new Date(date as string);

    // Dynamic Pricing Engine - Check HIGH_SEASON
    const highSeasonRule = activity.dynamicPricingRules.find(r => 
      r.triggerType === 'HIGH_SEASON' && 
      r.startDate && r.endDate && 
      targetDate >= r.startDate && targetDate <= r.endDate
    );

    if (highSeasonRule) {
      if (highSeasonRule.adjustmentType === 'PERCENTAGE') {
         currentPrice += currentPrice * (highSeasonRule.adjustmentValue / 100);
         currentChildPrice += currentChildPrice * (highSeasonRule.adjustmentValue / 100);
      } else {
         currentPrice += highSeasonRule.adjustmentValue;
         currentChildPrice += highSeasonRule.adjustmentValue;
      }
    }

    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        activityPackageId: id,
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    const availability = activity.sessions.map(session => {
        const sessionBookings = bookings.filter(b => b.sessionTimeId === session.id);
        const bookedPaxAdult = sessionBookings.reduce((sum, b) => sum + b.paxAdult, 0);
        const bookedPaxChild = sessionBookings.reduce((sum, b) => sum + b.paxChild, 0);
        const totalBooked = bookedPaxAdult + bookedPaxChild;
        
        const remainingCapacity = activity.maxCapacity - totalBooked;

        // Dynamic Pricing Engine - Check LOW_OCCUPANCY (e.g. if > x% filled, raise price)
        // For simplicity, we just return the calculated capacity
        return {
            ...session,
            bookedPaxAdult,
            bookedPaxChild,
            totalBooked,
            remainingCapacity,
            isAvailable: remainingCapacity > 0,
            currentPrice,
            currentChildPrice
        }
    });

    res.json(availability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
