import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
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

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
