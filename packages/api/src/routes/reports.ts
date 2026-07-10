import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const reportsRouter = Router();

// Dashboard summary
reportsRouter.get('/dashboard', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenantId = req.user!.tenantId;
    
    const [
      totalProducts,
      totalCategories,
      totalUsers,
      todayTransactions,
      todaySales,
      recentTransactions,
    ] = await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.category.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.transaction.count({
        where: { createdAt: { gte: today }, outlet: { tenantId } },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: today }, outlet: { tenantId } },
        _sum: { total: true },
      }),
      prisma.transaction.findMany({
        where: { outlet: { tenantId } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    
    res.json({
      totalProducts,
      totalCategories,
      totalUsers,
      todayTransactions,
      todaySales: todaySales._sum.total || 0,
      recentTransactions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily sales report
reportsRouter.get('/daily', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    let targetStart = new Date();
    let targetEnd = new Date();

    if (startDate && endDate) {
      targetStart = new Date(startDate as string);
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(endDate as string);
      targetEnd.setUTCHours(23, 59, 59, 999);
    } else if (date) {
      targetStart = new Date(date as string);
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);
    } else {
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);
    }

    const tenantId = req.user!.tenantId;
    
    const transactions = await prisma.transaction.findMany({
      where: {
        outlet: { tenantId },
        createdAt: {
          gte: targetStart,
          lte: targetEnd,
        },
      },
      include: {
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    
    res.json({
      startDate: targetStart.toISOString().split('T')[0],
      endDate: targetEnd.toISOString().split('T')[0],
      totalSales,
      totalTransactions,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Top selling products
reportsRouter.get('/top-products', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    const tenantId = req.user!.tenantId;

    let createdAtFilter: any = undefined;
    if (startDate && endDate) {
      const targetStart = new Date(startDate as string);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(endDate as string);
      targetEnd.setUTCHours(23, 59, 59, 999);
      createdAtFilter = {
        gte: targetStart,
        lte: targetEnd,
      };
    }

    // Filter transaction items by tenant via transaction -> outlet
    const transactions = await prisma.transaction.findMany({
      where: { 
        outlet: { tenantId },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      },
      select: { id: true }
    });
    const transactionIds = transactions.map(t => t.id);

    const topProducts = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transactionId: { in: transactionIds }
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });
    
    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, tenantId },
          include: { category: true },
        });
        return {
          product,
          totalSold: item._sum.quantity,
          totalRevenue: item._sum.subtotal,
        };
      })
    );
    
    res.json(productsWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Weekly sales trend
reportsRouter.get('/weekly-sales', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    const tenantId = req.user!.tenantId;
    
    const dailySales = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekAgo);
      dayStart.setDate(weekAgo.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      const sales = await prisma.transaction.aggregate({
        where: {
          outlet: { tenantId },
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        _sum: { total: true },
        _count: true,
      });
      
      dailySales.push({
        name: dayNames[dayStart.getDay()],
        date: dayStart.toISOString().split('T')[0],
        value: sales._sum.total || 0,
        transactions: sales._count || 0,
      });
    }
    
    res.json(dailySales);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Low stock alerts
reportsRouter.get('/low-stock', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 10;
    const tenantId = req.user!.tenantId;
    
    const lowStockItems = await prisma.productStock.findMany({
      where: {
        stock: { lte: threshold },
        outlet: { tenantId }
      },
      include: {
        product: { include: { category: { select: { name: true } } } },
        outlet: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });
    
    // Map to flatten structure for frontend compatibility
    const formattedResults = lowStockItems.map(item => ({
      ...item.product,
      stock: item.stock,
      outletName: item.outlet.name,
      id: item.productId, // Ensure ID matches product ID
      _originalId: item.id // Keep ProductStock ID if needed
    }));
    
    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment method breakdown
reportsRouter.get('/payment-breakdown', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenantId = req.user!.tenantId;
    
    const breakdown = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        outlet: { tenantId },
        createdAt: { gte: today },
      },
      _sum: { total: true },
      _count: true,
    });
    
    const result = breakdown.map((item) => ({
      method: item.paymentMethod,
      total: item._sum.total || 0,
      count: item._count,
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Sales comparison (today vs yesterday, this week vs last week)
reportsRouter.get('/comparison', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenantId = req.user!.tenantId;
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart);
    
    const [todaySales, yesterdaySales, thisWeekSales, lastWeekSales] = await Promise.all([
      prisma.transaction.aggregate({
        where: { outlet: { tenantId }, createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { outlet: { tenantId }, createdAt: { gte: yesterday, lt: today } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { outlet: { tenantId }, createdAt: { gte: thisWeekStart } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { outlet: { tenantId }, createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
        _sum: { total: true },
        _count: true,
      }),
    ]);
    
    const dailyChange = yesterdaySales._sum.total 
      ? ((todaySales._sum.total || 0) - (yesterdaySales._sum.total || 0)) / (yesterdaySales._sum.total || 1) * 100
      : 0;
    
    const weeklyChange = lastWeekSales._sum.total
      ? ((thisWeekSales._sum.total || 0) - (lastWeekSales._sum.total || 0)) / (lastWeekSales._sum.total || 1) * 100
      : 0;
    
    res.json({
      today: {
        sales: todaySales._sum.total || 0,
        transactions: todaySales._count || 0,
      },
      yesterday: {
        sales: yesterdaySales._sum.total || 0,
        transactions: yesterdaySales._count || 0,
      },
      thisWeek: {
        sales: thisWeekSales._sum.total || 0,
        transactions: thisWeekSales._count || 0,
      },
      lastWeek: {
        sales: lastWeekSales._sum.total || 0,
        transactions: lastWeekSales._count || 0,
      },
      dailyChange: parseFloat(dailyChange.toFixed(1)),
      weeklyChange: parseFloat(weeklyChange.toFixed(1)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
