import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
export const reportsRouter = Router();
// Dashboard summary
reportsRouter.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalProducts, totalCategories, totalUsers, todayTransactions, todaySales, recentTransactions,] = await Promise.all([
            prisma.product.count(),
            prisma.category.count(),
            prisma.user.count(),
            prisma.transaction.count({
                where: { createdAt: { gte: today } },
            }),
            prisma.transaction.aggregate({
                where: { createdAt: { gte: today } },
                _sum: { total: true },
            }),
            prisma.transaction.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Daily sales report
reportsRouter.get('/daily', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: targetDate,
                    lt: nextDay,
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
            date: targetDate.toISOString().split('T')[0],
            totalSales,
            totalTransactions,
            transactions,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Top selling products
reportsRouter.get('/top-products', authMiddleware, adminOnly, async (req, res) => {
    try {
        const topProducts = await prisma.transactionItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10,
        });
        const productsWithDetails = await Promise.all(topProducts.map(async (item) => {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                include: { category: true },
            });
            return {
                product,
                totalSold: item._sum.quantity,
                totalRevenue: item._sum.subtotal,
            };
        }));
        res.json(productsWithDetails);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Weekly sales trend
reportsRouter.get('/weekly-sales', authMiddleware, adminOnly, async (req, res) => {
    try {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Low stock alerts
reportsRouter.get('/low-stock', authMiddleware, adminOnly, async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const lowStockItems = await prisma.productStock.findMany({
            where: {
                stock: { lte: threshold },
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Payment method breakdown
reportsRouter.get('/payment-breakdown', authMiddleware, adminOnly, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const breakdown = await prisma.transaction.groupBy({
            by: ['paymentMethod'],
            where: {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Sales comparison (today vs yesterday, this week vs last week)
reportsRouter.get('/comparison', authMiddleware, adminOnly, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);
        const [todaySales, yesterdaySales, thisWeekSales, lastWeekSales] = await Promise.all([
            prisma.transaction.aggregate({
                where: { createdAt: { gte: today } },
                _sum: { total: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: { createdAt: { gte: yesterday, lt: today } },
                _sum: { total: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: { createdAt: { gte: thisWeekStart } },
                _sum: { total: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
