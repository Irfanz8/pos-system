import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
export const categoriesRouter = Router();
// Get all categories
categoriesRouter.get('/', authMiddleware, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get single category
categoriesRouter.get('/:id', authMiddleware, async (req, res) => {
    try {
        const category = await prisma.category.findUnique({
            where: { id: req.params.id },
            include: { products: true },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Create category (admin only)
categoriesRouter.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.category.create({
            data: { name, description },
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Update category (admin only)
categoriesRouter.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.category.update({
            where: { id: req.params.id },
            data: { name, description },
        });
        res.json(category);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete category (admin only)
categoriesRouter.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ message: 'Category deleted' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
