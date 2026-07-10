import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Helper: generate a URL-friendly slug from business name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Register — create a new tenant (business) + admin user
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    // Generate unique slug
    let slug = generateSlug(businessName);
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create tenant, user, and default outlet in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug,
        },
      });

      // 2. Create Admin User
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      // 3. Create Default Outlet
      const outlet = await tx.outlet.create({
        data: {
          name: `${businessName} - Main`,
          isHeadquarters: true,
          tenantId: tenant.id,
        },
      });

      // 4. Assign user to the default outlet
      await tx.user.update({
        where: { id: user.id },
        data: { outletId: outlet.id },
      });

      return { tenant, user: { ...user, outletId: outlet.id }, outlet };
    });

    // Generate JWT
    const token = jwt.sign(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        outletId: result.user.outletId,
        tenantId: result.tenant.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        outletId: result.user.outletId,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
      },
    });
  } catch (error: any) {
    console.error("Register route error:", error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Ensure a default outlet exists for this tenant
    const tenantOutlet = await prisma.outlet.findFirst({
      where: { tenantId: user.tenantId },
    });
    let defaultOutletId = tenantOutlet?.id;
    if (!defaultOutletId) {
      const mainOutlet = await prisma.outlet.create({
        data: { name: 'Main Outlet', isHeadquarters: true, tenantId: user.tenantId },
      });
      defaultOutletId = mainOutlet.id;
    }

    // Auto-assign user to an outlet if not assigned
    if (!user.outletId && defaultOutletId) {
       await prisma.user.update({ where: { id: user.id }, data: { outletId: defaultOutletId } });
       user.outletId = defaultOutletId;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
        tenantId: user.tenantId,
      },
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
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
    });
  } catch (error: any) {
    console.error("Login route error:", error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current user
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        outletId: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    res.json(user);
  } catch (error: any) {
    console.error("Get /me route error:", error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});
