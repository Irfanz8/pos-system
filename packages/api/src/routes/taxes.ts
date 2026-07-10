import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const taxesRouter = Router();

// Get all taxes (can filter by outletId) — scoped to tenant
taxesRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { outletId } = req.query;
    const tenantId = req.user!.tenantId;
    
    const taxes = await prisma.tax.findMany({
      where: {
        outlet: { tenantId },
        ...(outletId ? { outletId: String(outletId) } : {})
      },
      orderBy: { name: 'asc' },
    });
    res.json(taxes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single tax
taxesRouter.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const tax = await prisma.tax.findFirst({
      where: { id: req.params.id, outlet: { tenantId } },
    });
    
    if (!tax) {
      return res.status(404).json({ error: 'Tax not found' });
    }
    
    res.json(tax);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create tax (admin only)
taxesRouter.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, rate, type, isActive, outletId } = req.body;
    const tenantId = req.user!.tenantId;
    
    // validate
    if (!name || isNaN(rate) || !type || !outletId) {
       return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify outlet belongs to tenant
    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, tenantId } });
    if (!outlet) return res.status(403).json({ error: 'Outlet not found' });

    const tax = await prisma.tax.create({
      data: { 
        name, 
        rate: Number(rate), 
        type, 
        isActive: isActive !== undefined ? isActive : true,
        outletId 
      },
    });
    res.status(201).json(tax);
  } catch (error: any) {
    if (error.code === 'P2002') {
       return res.status(400).json({ error: 'A tax with this name already exists in this outlet' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tax (admin only)
taxesRouter.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, rate, type, isActive } = req.body;
    const tenantId = req.user!.tenantId;
    
    // Verify tax belongs to tenant
    const existing = await prisma.tax.findFirst({ where: { id: req.params.id, outlet: { tenantId } } });
    if (!existing) return res.status(404).json({ error: 'Tax not found' });

    const tax = await prisma.tax.update({
      where: { id: req.params.id },
      data: { 
        ...(name && { name }), 
        ...(rate !== undefined && { rate: Number(rate) }), 
        ...(type && { type }), 
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(tax);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tax not found' });
    }
    if (error.code === 'P2002') {
       return res.status(400).json({ error: 'A tax with this name already exists in this outlet' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete tax (admin only)
taxesRouter.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    
    // Verify tax belongs to tenant
    const existing = await prisma.tax.findFirst({ where: { id: req.params.id, outlet: { tenantId } } });
    if (!existing) return res.status(404).json({ error: 'Tax not found' });

    await prisma.tax.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tax deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tax not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
