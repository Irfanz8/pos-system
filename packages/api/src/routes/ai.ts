import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

export const aiRouter = Router();

// Helper: Linear Regression
function linearRegression(y: number[]) {
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i); // 0, 1, 2, ...
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// 1. Sales Prediction (Next 7 days)
aiRouter.get('/sales-prediction', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { outletId } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Last 30 days

    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (outletId) where.outletId = outletId as string;

    const transactions = await prisma.transaction.findMany({
      where,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailySales = new Map<string, number>();
    // Initialize last 30 days with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailySales.set(d.toISOString().split('T')[0], 0);
    }

    transactions.forEach(t => {
      const date = t.createdAt.toISOString().split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + t.total);
    });

    const historicalData = Array.from(dailySales.entries()).map(([date, total]) => ({ date, total }));
    const values = historicalData.map(d => d.total);

    // Predict next 7 days
    const { slope, intercept } = linearRegression(values);
    const predictions = [];
    for (let i = 1; i <= 7; i++) {
        const nextDay = new Date(endDate);
        nextDay.setDate(endDate.getDate() + i);
        const x = values.length - 1 + i;
        const predictedAmount = Math.max(0, slope * x + intercept); // No negative sales
        predictions.push({
            date: nextDay.toISOString().split('T')[0],
            predicted: predictedAmount
        });
    }

    res.json({ historical: historicalData, predictions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Stock Recommendations (Items running low based on sales velocity)
aiRouter.get('/stock-recommendations', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { outletId } = req.query;
    if (!outletId) return res.status(400).json({ error: 'Outlet ID required' });

    // Get sales from last 30 days to calculate velocity
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        outletId: outletId as string,
        createdAt: { gte: startDate },
      },
      include: { items: true }
    });

    // Calculate daily average consumption per product
    const productUsage = new Map<string, number>();
    transactions.forEach(t => {
      t.items.forEach(item => {
        productUsage.set(item.productId, (productUsage.get(item.productId) || 0) + item.quantity);
      });
    });

    // Get current stock
    const stocks = await prisma.productStock.findMany({
      where: { outletId: outletId as string },
      include: { product: true }
    });

    const recommendations = [];

    for (const s of stocks) {
      const totalSold30Days = productUsage.get(s.productId) || 0;
      const dailyVelocity = totalSold30Days / 30;
      
      // Days Inventory Outstanding (DIO)
      // If velocity is 0, DIO is infinity (safe)
      const dio = dailyVelocity > 0 ? s.stock / dailyVelocity : 999;

      // Recommend if DIO < 7 days
      if (dio < 7 || s.stock <= (s.minStock || 5)) {
        recommendations.push({
          productId: s.productId,
          productName: s.product.name,
          currentStock: s.stock,
          dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
          daysLeft: Math.round(dio),
          reason: dio < 7 ? 'High Sales Velocity' : 'Low Stock Level'
        });
      }
    }

    // Sort by urgency (fewer days left first)
    recommendations.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json(recommendations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Anomaly Detection (Outliers in transaction amounts)
aiRouter.get('/anomalies', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { outletId } = req.query;
    const where: any = {};
    if (outletId) where.outletId = outletId as string;

    // Get last 1000 transactions for statistical significance
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: { 
        user: { select: { name: true } },
        outlet: { select: { name: true } }
      }
    });

    if (transactions.length < 10) return res.json([]); // Not enough data

    // Calculate Mean and StdDev
    const totals = transactions.map(t => t.total);
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totals.length;
    const stdDev = Math.sqrt(variance);

    // Filter outliers (Z-Score > 3 or < -3)
    // We mainly care about unusually HIGH amounts (> 3) or weirdly LOW if valid
    const anomalies = transactions
      .map(t => {
        const zScore = (t.total - mean) / stdDev;
        return { ...t, zScore };
      })
      .filter(t => Math.abs(t.zScore) > 3)
      .map(t => ({
        id: t.id,
        receiptNo: t.receiptNo,
        date: t.createdAt,
        total: t.total,
        cashier: t.user?.name,
        outlet: t.outlet?.name,
        zScore: parseFloat(t.zScore.toFixed(2)),
        type: t.zScore > 0 ? 'High Value' : 'Low Value'
      }));

    res.json(anomalies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
