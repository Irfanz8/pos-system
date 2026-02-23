import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
export const customersRouter = Router();
// Get all customers
customersRouter.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, tier, page = 1, limit = 20 } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (tier)
            where.tier = tier;
        const customers = await prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        const total = await prisma.customer.count({ where });
        res.json({
            data: customers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get customer by phone (for cashier quick lookup)
customersRouter.get('/by-phone/:phone', authMiddleware, async (req, res) => {
    try {
        const { phone } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { phone },
            include: {
                _count: { select: { transactions: true } },
            },
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get customer by ID
customersRouter.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: { include: { product: true } },
                    },
                },
                _count: { select: { transactions: true } },
            },
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Create customer
customersRouter.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }
        // Check if phone exists
        const existing = await prisma.customer.findUnique({
            where: { phone },
        });
        if (existing) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }
        const customer = await prisma.customer.create({
            data: { name, phone, email },
        });
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Update customer
customersRouter.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, points, tier } = req.body;
        const customer = await prisma.customer.update({
            where: { id },
            data: { name, phone, email, points, tier },
        });
        res.json(customer);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Phone number already registered' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// Add points to customer
customersRouter.post('/:id/points', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type } = req.body; // type: 'add' or 'redeem'
        const customer = await prisma.customer.findUnique({
            where: { id },
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        let newPoints = customer.points;
        if (type === 'add') {
            newPoints += amount;
        }
        else if (type === 'redeem') {
            if (customer.points < amount) {
                return res.status(400).json({ error: 'Insufficient points' });
            }
            newPoints -= amount;
        }
        // Auto-upgrade tier based on points
        let newTier = customer.tier;
        if (newPoints >= 10000)
            newTier = 'PLATINUM';
        else if (newPoints >= 5000)
            newTier = 'GOLD';
        else if (newPoints >= 1000)
            newTier = 'SILVER';
        const updated = await prisma.customer.update({
            where: { id },
            data: { points: newPoints, tier: newTier },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete customer (admin only)
customersRouter.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({
            where: { id },
        });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
