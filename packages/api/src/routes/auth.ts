import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Ensure a default outlet exists (for migration/initial setup)
    const anyOutlet = await prisma.outlet.findFirst();
    let defaultOutletId = anyOutlet?.id;
    if (!defaultOutletId) {
      const mainOutlet = await prisma.outlet.create({
        data: { name: 'Main Outlet', isHeadquarters: true, address: 'Pusat' }
      });
      defaultOutletId = mainOutlet.id;
    }

    // Auto-assign user to main outlet if not assigned (migration)
    if (!user.outletId && defaultOutletId) {
       await prisma.user.update({ where: { id: user.id }, data: { outletId: defaultOutletId } });
       user.outletId = defaultOutletId;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
