import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const stockRouter = Router();

// Get all stock (with ProductStock)
stockRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { outletId } = req.query;
    
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stocks: {
            where: outletId ? { outletId: outletId as string } : undefined
        }
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stock movements for a product
stockRouter.get('/movements/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20, outletId } = req.query;
    
    const where: any = { productId };
    if (outletId) where.outletId = outletId as string;

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    
    const total = await prisma.stockMovement.count({ where });
    
    res.json({
      data: movements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all stock movements (admin only)
stockRouter.get('/movements', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    
    const where: any = {};
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    
    const total = await prisma.stockMovement.count({ where });
    
    res.json({
      data: movements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock (Adjustment)
stockRouter.post('/adjust', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { productId, type, quantity, reason, outletId } = req.body;
    
    const targetOutletId = outletId || req.user?.outletId;
    if (!targetOutletId) return res.status(400).json({ error: 'Outlet ID required' });

    // Validate product
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const adjustment = parseInt(quantity);
    
    // Update ProductStock
    let newStock = 0;
    
    if (type === 'IN' || type === 'RETURN') {
       const ps = await prisma.productStock.upsert({
           where: { productId_outletId: { productId, outletId: targetOutletId } },
           update: { stock: { increment: adjustment } },
           create: { productId, outletId: targetOutletId, stock: adjustment }
       });
       newStock = ps.stock;
    } else if (type === 'OUT') {
       const ps = await prisma.productStock.upsert({
           where: { productId_outletId: { productId, outletId: targetOutletId } },
           update: { stock: { decrement: adjustment } },
           create: { productId, outletId: targetOutletId, stock: -adjustment }
       });
       newStock = ps.stock;
    } else if (type === 'ADJUSTMENT') {
       // Assume ADJUSMENT is a delta for consistency in this implementation
       const ps = await prisma.productStock.upsert({
           where: { productId_outletId: { productId, outletId: targetOutletId } },
           update: { stock: { increment: adjustment } },
           create: { productId, outletId: targetOutletId, stock: adjustment }
       });
       newStock = ps.stock;
    }

    // Record movement
    await prisma.stockMovement.create({
      data: {
        productId,
        outletId: targetOutletId,
        type,
        quantity: adjustment,
        reason,
        createdBy: req.user!.id,
      },
    });
    
    res.json({ success: true, newStock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk stock adjustment (stock opname)
stockRouter.post('/opname', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, actualStock, reason }]
    const userId = (req as any).user.id;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    const results = [];
    
    for (const item of items) {
      if (!item.outletId) continue;

      const productStock = await prisma.productStock.findUnique({
        where: { productId_outletId: { productId: item.productId, outletId: item.outletId } },
      });
      
      const currentStock = productStock ? productStock.stock : 0;
      const difference = item.actualStock - currentStock;
      
      if (difference !== 0) {
        const [movement, updatedStock] = await prisma.$transaction([
          prisma.stockMovement.create({
            data: {
              productId: item.productId,
              outletId: item.outletId,
              type: 'ADJUSTMENT',
              quantity: difference,
              reason: item.reason || 'Stock opname',
              createdBy: userId,
            },
          }),
          prisma.productStock.upsert({
            where: { productId_outletId: { productId: item.productId, outletId: item.outletId } },
            update: { stock: item.actualStock },
            create: { productId: item.productId, outletId: item.outletId, stock: item.actualStock },
          }),
        ]);
        
        results.push({ movement, stock: updatedStock });
      }
    }
    
    res.json({ 
      message: `Stock opname completed. ${results.length} items adjusted.`,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
