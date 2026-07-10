import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const categoriesRouter = Router();

// Get all categories
categoriesRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const categories = await prisma.category.findMany({
      where: { tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single category
categoriesRouter.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { products: true },
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
categoriesRouter.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const category = await prisma.category.create({
      data: { name, description, tenantId: req.user!.tenantId },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update category (admin only)
categoriesRouter.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const tenantId = req.user!.tenantId;
    
    // Verify category belongs to tenant
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, description },
    });
    res.json(category);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category (admin only)
categoriesRouter.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const categoryId = req.params.id;
    
    const existing = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    
    const productCount = await prisma.product.count({ where: { categoryId } });
    if (productCount > 0) {
      return res.status(400).json({ error: 'Tidak bisa hapus category karena ada isinya' });
    }
    
    await prisma.category.delete({ where: { id: categoryId } });
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
