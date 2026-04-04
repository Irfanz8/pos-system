import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const taxesRouter = Router();

// Get all taxes (can filter by outletId)
taxesRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { outletId } = req.query;
    const taxes = await prisma.tax.findMany({
      where: outletId ? { outletId: String(outletId) } : undefined,
      orderBy: { name: 'asc' },
    });
    res.json(taxes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single tax
taxesRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tax = await prisma.tax.findUnique({
      where: { id: req.params.id },
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
    
    // validate
    if (!name || isNaN(rate) || !type || !outletId) {
       return res.status(400).json({ error: 'Missing required fields' });
    }

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
    await prisma.tax.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tax deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tax not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
