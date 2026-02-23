import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
export const promosRouter = Router();
// Get all promos
promosRouter.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, isActive, type } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        if (type)
            where.type = type;
        const promos = await prisma.promo.findMany({
            where,
            include: {
                product: { select: { name: true } },
                category: { select: { name: true } },
                _count: { select: { transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(promos);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get promo by ID
promosRouter.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const promo = await prisma.promo.findUnique({
            where: { id },
            include: {
                product: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
                transactions: {
                    take: 10,
                    orderBy: { id: 'desc' },
                    include: {
                        transaction: {
                            select: { receiptNo: true, total: true, createdAt: true },
                        },
                    },
                },
            },
        });
        if (!promo) {
            return res.status(404).json({ error: 'Promo not found' });
        }
        res.json(promo);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Create promo (admin only)
promosRouter.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { code, name, description, type, discountValue, buyQuantity, getQuantity, productId, categoryId, minPurchase, startDate, endDate, maxUsage, } = req.body;
        if (!code || !name || !type || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if code already exists
        const existing = await prisma.promo.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: 'Promo code already exists' });
        }
        const promo = await prisma.promo.create({
            data: {
                code: code.toUpperCase(),
                name,
                description,
                type,
                discountValue: discountValue || 0,
                buyQuantity,
                getQuantity,
                productId: productId || null,
                categoryId: categoryId || null,
                minPurchase: minPurchase || 0,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                maxUsage,
            },
        });
        res.status(201).json(promo);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Update promo (admin only)
promosRouter.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, description, type, discountValue, buyQuantity, getQuantity, productId, categoryId, minPurchase, startDate, endDate, isActive, maxUsage, } = req.body;
        const data = {};
        if (code !== undefined)
            data.code = code.toUpperCase();
        if (name !== undefined)
            data.name = name;
        if (description !== undefined)
            data.description = description;
        if (type !== undefined)
            data.type = type;
        if (discountValue !== undefined)
            data.discountValue = discountValue;
        if (buyQuantity !== undefined)
            data.buyQuantity = buyQuantity;
        if (getQuantity !== undefined)
            data.getQuantity = getQuantity;
        if (productId !== undefined)
            data.productId = productId || null;
        if (categoryId !== undefined)
            data.categoryId = categoryId || null;
        if (minPurchase !== undefined)
            data.minPurchase = minPurchase;
        if (startDate !== undefined)
            data.startDate = new Date(startDate);
        if (endDate !== undefined)
            data.endDate = new Date(endDate);
        if (isActive !== undefined)
            data.isActive = isActive;
        if (maxUsage !== undefined)
            data.maxUsage = maxUsage;
        const promo = await prisma.promo.update({
            where: { id },
            data,
        });
        res.json(promo);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Promo code already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete promo (admin only)
promosRouter.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        // Delete related TransactionPromos first
        await prisma.transactionPromo.deleteMany({ where: { promoId: id } });
        await prisma.promo.delete({ where: { id } });
        res.json({ message: 'Promo deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Validate promo code (for cashier)
promosRouter.post('/validate', authMiddleware, async (req, res) => {
    try {
        const { code, total, items } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Promo code is required' });
        }
        const promo = await prisma.promo.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                product: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
            },
        });
        if (!promo) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        // Check if active
        if (!promo.isActive) {
            return res.status(400).json({ error: 'Promo is not active' });
        }
        // Check date range
        const now = new Date();
        if (now < promo.startDate || now > promo.endDate) {
            return res.status(400).json({ error: 'Promo has expired or not yet started' });
        }
        // Check max usage
        if (promo.maxUsage && promo.usageCount >= promo.maxUsage) {
            return res.status(400).json({ error: 'Promo usage limit reached' });
        }
        // Check minimum purchase
        if (total && total < promo.minPurchase) {
            return res.status(400).json({ error: `Minimum purchase is ${promo.minPurchase}` });
        }
        // Calculate discount
        let discount = 0;
        if (promo.type === 'PERCENTAGE') {
            discount = (total || 0) * (promo.discountValue / 100);
        }
        else if (promo.type === 'NOMINAL') {
            discount = promo.discountValue;
        }
        // BUY_X_GET_Y handled on frontend
        res.json({
            valid: true,
            promo,
            discount,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
