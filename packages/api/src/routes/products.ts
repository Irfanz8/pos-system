import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const productsRouter = Router();

// Get all products
productsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { categoryId, search, limit } = req.query;
    const tenantId = req.user!.tenantId;
    
    const take = limit ? parseInt(limit as string, 10) : undefined;
    
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        ...(categoryId && { categoryId: categoryId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { sku: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: { 
        category: true,
        stocks: true 
      },
      orderBy: { name: 'asc' },
      ...(take && { take }),
    });
    
    // Map to include a virtual 'stock' field
    const productsWithStock = products.map((p: any) => {
        let stock = 0;
        if (req.query.outletId) {
            const outletStock = p.stocks.find((s: any) => s.outletId === req.query.outletId);
            stock = outletStock ? outletStock.stock : 0;
        } else {
            stock = p.stocks.reduce((acc: number, s: any) => acc + s.stock, 0);
        }
        return { ...p, stock };
    });
    
    res.json(productsWithStock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
productsRouter.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { 
        category: true,
        stocks: { include: { outlet: true } }
      },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productWithStock = {
      ...product,
      stock: (product as any).stocks.reduce((acc: number, s: any) => acc + s.stock, 0)
    };
    
    res.json(productWithStock);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (admin only)
productsRouter.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, sku, price, stock, categoryId, image, outletId, trackStock } = req.body;
    const tenantId = req.user!.tenantId;
    
    // Create product without stock first
    const product = await prisma.product.create({
      data: { 
        name, sku, price, categoryId, image, tenantId,
        trackStock: trackStock !== undefined ? trackStock : true 
      },
      include: { category: true },
    });
    
    if (stock && stock > 0) {
        let targetOutletId = outletId;
        
        // Fallback backward-compatibility (If user posts via old API clients)
        if (!targetOutletId) {
            const hq = await prisma.outlet.findFirst({ where: { isHeadquarters: true, tenantId } });
            if (hq) targetOutletId = hq.id;
            else {
                const anyOutlet = await prisma.outlet.findFirst({ where: { tenantId } });
                if (anyOutlet) targetOutletId = anyOutlet.id;
            }
        }
        
        if (targetOutletId) {
            await prisma.productStock.create({
                data: {
                    productId: product.id,
                    outletId: targetOutletId,
                    stock: Number(stock),
                }
            });
            
             await prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    outletId: targetOutletId,
                    type: 'IN',
                    quantity: Number(stock),
                    reason: 'Initial Stock',
                    createdBy: req.user!.id,
                },
            });
        }
    }
    
    res.status(201).json(product);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (admin only)
productsRouter.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, sku, price, categoryId, image, trackStock } = req.body;
    const tenantId = req.user!.tenantId;
    
    // Verify product belongs to tenant
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { 
        name, sku, price, categoryId, image,
        ...(trackStock !== undefined && { trackStock })
      },
      include: { category: true },
    });
    
    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (admin only)
productsRouter.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const productId = req.params.id;
    
    // Verify product belongs to tenant
    const existing = await prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    
    // Check if product has been sold
    const hasTransactions = await prisma.transactionItem.findFirst({ where: { productId } });
    if (hasTransactions) {
      return res.status(400).json({ error: 'Tidak bisa menghapus produk karena sudah memiliki riwayat transaksi.' });
    }
    
    await prisma.$transaction([
      prisma.promo.updateMany({ where: { productId }, data: { productId: null } }),
      prisma.stockMovement.deleteMany({ where: { productId } }),
      prisma.productStock.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } })
    ]);
    
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
