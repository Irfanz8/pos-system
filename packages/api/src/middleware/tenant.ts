import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Tenant middleware — ensures a tenantId is present in the authenticated user's JWT.
 * Must be used AFTER authMiddleware.
 */
export const tenantMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: 'Tenant context required. Please login again.' });
  }
  next();
};
