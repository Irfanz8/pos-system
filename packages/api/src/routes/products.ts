import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const productsRouter = Router();

// Get all products
productsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { categoryId, search } = req.query;
    
    // We can't easily filter by stock here without raw query or post-processing, 
    // but the requirement didn't specify filtering by stock level for the general list.
    
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId && { categoryId: categoryId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string } },
            { sku: { contains: search as string } },
          ],
        }),
      },
      include: { 
        category: true,
        stocks: true 
      },
      orderBy: { name: 'asc' },
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
productsRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
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
    const { name, sku, price, stock, categoryId, image } = req.body;
    
    // Create product without stock first
    const product = await prisma.product.create({
      data: { name, sku, price, categoryId, image },
      include: { category: true },
    });
    
    // If stock is provided, try to add it to Main Outlet
    if (stock && stock > 0) {
        const mainOutlet = await prisma.outlet.findFirst({
            where: { isHeadquarters: true }
        });
        
        // If no HQ, try any outlet, or create one? 
        // For now, if no outlet, we skip stock creation (User should Create Outlet first)
        if (mainOutlet) {
            await prisma.productStock.create({
                data: {
                    productId: product.id,
                    outletId: mainOutlet.id,
                    stock: Number(stock),
                }
            });
            
             await prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    outletId: mainOutlet.id,
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
    const { name, sku, price, categoryId, image } = req.body;
    
    // Note: Stock update is NOT handled here anymore. Use Stock API.
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, sku, price, categoryId, image },
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
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
