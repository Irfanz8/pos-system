# POS System

Sistem Point of Sale dengan 2 aplikasi: **Admin Dashboard** dan **Cashier App**.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS + TanStack Router
- **Backend**: Node.js + Express + Prisma
- **Database**: SQLite

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Run semua apps
npm run dev
```

## URLs

| App     | URL                   |
| ------- | --------------------- |
| Admin   | http://localhost:5173 |
| Cashier | http://localhost:5174 |
| API     | http://localhost:3000 |

## Default Users

| Email         | Password | Role    |
| ------------- | -------- | ------- |
| admin@pos.com | admin123 | ADMIN   |
| kasir@pos.com | kasir123 | CASHIER |

## Project Structure

```
pos-system/
├── apps/
│   ├── admin/      # Admin Dashboard
│   └── cashier/    # Cashier POS App
├── packages/
│   ├── api/        # Backend API
│   ├── database/   # Prisma schema
│   └── shared/     # Shared types
└── package.json
```
