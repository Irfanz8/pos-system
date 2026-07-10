import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

export const kdsRouter = Router();

// Get active orders for KDS — scoped to tenant
kdsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const orders = await prisma.transaction.findMany({
      where: {
        outlet: { tenantId },
        status: {
          in: ['PENDING', 'PROCESSING', 'READY'],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { name: true },
        },
        customer: {
            select: { name: true },
        }
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
kdsRouter.put('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.user!.tenantId;

    if (!['PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify order belongs to tenant
    const existing = await prisma.transaction.findFirst({ where: { id, outlet: { tenantId } } });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const order = await prisma.transaction.update({
      where: { id },
      data: { status },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
