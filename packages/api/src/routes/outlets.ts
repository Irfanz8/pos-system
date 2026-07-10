import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const outletsRouter = Router();

// Get all outlets — scoped to tenant
outletsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const outlets = await prisma.outlet.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create outlet (Admin only)
outletsRouter.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, address, phone, isHeadquarters } = req.body;
    const tenantId = req.user!.tenantId;

    // If setting as HQ, unset others within tenant
    if (isHeadquarters) {
      await prisma.outlet.updateMany({
        where: { isHeadquarters: true, tenantId },
        data: { isHeadquarters: false },
      });
    }

    const outlet = await prisma.outlet.create({
      data: { name, address, phone, isHeadquarters, tenantId },
    });

    res.json(outlet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update outlet
outletsRouter.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, isHeadquarters } = req.body;
    const tenantId = req.user!.tenantId;

    // Verify outlet belongs to tenant
    const existing = await prisma.outlet.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Outlet not found' });

    if (isHeadquarters) {
       await prisma.outlet.updateMany({
         where: { isHeadquarters: true, id: { not: id }, tenantId },
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
outletsRouter.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    
    const existing = await prisma.outlet.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Outlet not found' });
    
    // Check if has dependencies
    const hasUsers = await prisma.user.count({ where: { outletId: id } });
    if (hasUsers > 0) return res.status(400).json({ error: 'Cannot delete outlet with users' });

    await prisma.outlet.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
