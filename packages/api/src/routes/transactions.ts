import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest, adminOnly } from '../middleware/auth.js';

export const transactionsRouter = Router();

// Generate receipt number
function generateReceiptNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${dateStr}-${random}`;
}

// Get all transactions
transactionsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20, outletId } = req.query;
    
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    // Cashiers can only see their own transactions, Admin can filter by outlet or see all
    if (req.user?.role === 'CASHIER') {
      where.userId = req.user.id;
    } else if (outletId) {
      where.outletId = outletId as string;
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true } },
        payments: true,
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    
    const total = await prisma.transaction.count({ where });
    
    res.json({
      data: transactions,
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

// Public receipt endpoint (no auth)
transactionsRouter.get('/public/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true } },
        payments: true,
        outlet: { select: { id: true, name: true, address: true, phone: true } },
      },
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single transaction / receipt
transactionsRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true, tier: true, points: true } },
        items: { include: { product: true } },
        payments: true,
        outlet: { select: { id: true, name: true } },
      },
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get receipt by receipt number
transactionsRouter.get('/receipt/:receiptNo', authMiddleware, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { receiptNo: req.params.receiptNo },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true, tier: true } },
        items: { include: { product: true } },
        payments: true,
        outlet: { select: { id: true, name: true } },
      },
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transaction (checkout) with split payment support
transactionsRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { 
      items, 
      paid, 
      paymentMethod, 
      payments,  // Array of { method, amount, reference? } for split payment
      customerId,
      discount = 0,
      redeemPoints = 0,
      outletId,
    } = req.body;

    const targetOutletId = outletId || req.user?.outletId;
    if (!targetOutletId) {
        return res.status(400).json({ error: 'Outlet ID required' });
    }
    
    // Validate stock per outlet
    for (const item of items) {
      if (item.productId) { 
         const productStock = await prisma.productStock.findUnique({
            where: {
                productId_outletId: {
                    productId: item.productId,
                    outletId: targetOutletId
                }
            }
         });
         
         const currentStock = productStock?.stock || 0;
         if (currentStock < item.quantity) {
             return res.status(400).json({ error: `Insufficient stock for product ${item.productId} at this outlet` });
         }
      }
    }

    // Calculate total logic
    let subtotal = 0;
    const transactionItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      
      const itemDiscount = item.discount || 0;
      const itemSubtotal = (product.price * item.quantity) - itemDiscount;
      subtotal += itemSubtotal;
      
      transactionItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        discount: itemDiscount,
        subtotal: itemSubtotal,
      });
    }

    // Calculate point redemption
    let pointDiscount = 0;
    let pointsRedeemed = 0;
    
    if (redeemPoints && redeemPoints > 0) {
      if (!customerId) return res.status(400).json({ error: 'Customer required for point redemption' });
      
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      if (customer.points < redeemPoints) return res.status(400).json({ error: 'Insufficient points' });
      
      pointsRedeemed = redeemPoints;
      pointDiscount = pointsRedeemed * 100;
    }

    const totalDiscount = (discount || 0) + pointDiscount;
    const total = Math.max(0, subtotal - totalDiscount);
    
    // Calculate total paid
    let totalPaid = paid;
    if (payments && Array.isArray(payments) && payments.length > 0) {
      totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    }
    
    if (totalPaid < total) {
      return res.status(400).json({ error: 'Pembayaran kurang' });
    }
    
    const receiptNo = generateReceiptNo();
    
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user!.id,
        customerId: customerId || null,
        outletId: targetOutletId,
        total,
        paid: totalPaid,
        change: totalPaid - total,
        discount: totalDiscount,
        paymentMethod: payments ? payments[0].method : paymentMethod,
        receiptNo,
        items: { create: transactionItems },
        payments: payments ? {
          create: payments.map((p: any) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference || null,
          })),
        } : {
          create: [{ method: paymentMethod, amount: totalPaid }],
        },
        status: 'COMPLETED',
      },
      include: {
        items: { include: { product: true } },
      },
    });
    
    // Update Stock (ProductStock) & History
    for (const item of items) {
       await prisma.productStock.upsert({
          where: { productId_outletId: { productId: item.productId, outletId: targetOutletId } },
          update: { stock: { decrement: item.quantity } },
          create: { productId: item.productId, outletId: targetOutletId, stock: -item.quantity }
       });

       await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            outletId: targetOutletId,
            type: 'OUT',
            quantity: item.quantity,
            reason: 'Sale',
            reference: transaction.id,
            createdBy: req.user!.id,
          },
        });
    }
    
    // Handle Points (Deduct redeemed and Add earned)
    if (customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (customer) {
            let newPoints = customer.points;
            if (pointsRedeemed > 0) newPoints -= pointsRedeemed;
            
            const pointsEarned = Math.floor(total / 10000);
            newPoints += pointsEarned;
            
            let newTier = customer.tier; // Simplistic tier logic
            if (newPoints >= 10000) newTier = 'PLATINUM';
            else if (newPoints >= 5000) newTier = 'GOLD';
            else if (newPoints >= 1000) newTier = 'SILVER';
            
            await prisma.customer.update({
                where: { id: customerId },
                data: { points: newPoints, tier: newTier },
            });
        }
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Void transaction (admin only)
transactionsRouter.post('/:id/void', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Return stock (ProductStock)
    const targetOutletId = transaction.outletId;
    
    for (const item of transaction.items) {
      if (targetOutletId) {
          await prisma.productStock.upsert({
              where: { productId_outletId: { productId: item.productId, outletId: targetOutletId } },
              update: { stock: { increment: item.quantity } },
              create: { productId: item.productId, outletId: targetOutletId, stock: item.quantity }
          });
          
          await prisma.stockMovement.create({
            data: {
                productId: item.productId,
                outletId: targetOutletId,
                type: 'RETURN',
                quantity: item.quantity,
                reason: `Void: ${reason || 'No reason'}`,
                reference: transaction.id,
                createdBy: (req as any).user.id,
            },
          });
      }
    }
    
    // Delete transaction
    await prisma.transaction.delete({
      where: { id },
    });
    
    res.json({ message: 'Transaction voided successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
