import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
export const usersRouter = Router();
// Get all users (admin only)
usersRouter.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                outlet: { select: { id: true, name: true } },
                createdAt: true,
                _count: { select: { transactions: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Create user (admin only)
usersRouter.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, email, password, role, outletId } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, outletId },
            select: { id: true, name: true, email: true, role: true, outlet: { select: { id: true, name: true } }, createdAt: true },
        });
        res.status(201).json(user);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// Update user (admin only)
usersRouter.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, email, password, role, outletId } = req.body;
        const data = { name, email, role, outletId };
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: { id: true, name: true, email: true, role: true, outlet: { select: { id: true, name: true } }, createdAt: true },
        });
        res.json(user);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete user (admin only)
usersRouter.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user?.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
