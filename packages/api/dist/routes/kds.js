import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
export const kdsRouter = Router();
// Get active orders for KDS
kdsRouter.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await prisma.transaction.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PROCESSING', 'READY'],
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: { name: true },
                },
                customer: {
                    select: { name: true },
                }
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Update order status
kdsRouter.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const order = await prisma.transaction.update({
            where: { id },
            data: { status },
        });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
