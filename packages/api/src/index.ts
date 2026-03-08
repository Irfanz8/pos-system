import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { categoriesRouter } from './routes/categories.js';
import { transactionsRouter } from './routes/transactions.js';
import { reportsRouter } from './routes/reports.js';
import { usersRouter } from './routes/users.js';
import { stockRouter } from './routes/stock.js';
import { customersRouter } from './routes/customers.js';
import { promosRouter } from './routes/promos.js';
import { outletsRouter } from './routes/outlets.js';
import { emailRouter } from './routes/email.js';
import { aiRouter } from './routes/ai.js';
import { shiftsRouter } from './routes/shifts.js';
import { kdsRouter } from './routes/kds.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);
app.use('/api/kds', kdsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/customers', customersRouter);
app.use('/api/promos', promosRouter);
app.use('/api/outlets', outletsRouter);
app.use('/api/email', emailRouter);
app.use('/api/ai', aiRouter);
app.use('/api/shifts', shiftsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Serve Frontend Static Files (Production / cPanel) ---
if (process.env.NODE_ENV === 'production') {
  const adminDistPath = path.resolve(__dirname, '../../../apps/admin/dist');
  const cashierDistPath = path.resolve(__dirname, '../../../apps/cashier/dist');

  // Serve Admin Dashboard static files at /admin/
  app.use('/admin', express.static(adminDistPath));

  // Admin SPA fallback: any /admin/* route that doesn't match a file → admin's index.html
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });

  // Serve Cashier App static files at root /
  app.use(express.static(cashierDistPath));

  // Cashier SPA fallback: any remaining route → cashier's index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(cashierDistPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 API running at http://localhost:${PORT}`);
  });
}

// Export the express app so Vercel can run it as Serverless Function
export default app;

