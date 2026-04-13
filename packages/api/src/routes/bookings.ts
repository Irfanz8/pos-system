import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createBookingSchema } from '../schemas/booking.js';

export const bookingsRouter = Router();

// Get bookings (for Calendar/Schedule View)
bookingsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { outletId, date, hasPendingBalance } = req.query;
    let dateFilter = {};
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = { bookingDate: { gte: startOfDay, lte: endOfDay } };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        ...(outletId ? { activityPackage: { outletId: String(outletId) } } : {}),
        ...dateFilter,
        ...(hasPendingBalance === 'true' ? { balanceDue: { gt: 0 }, status: { not: 'CANCELLED' } } : {}),
      },
      include: {
        activityPackage: true,
        sessionTime: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Create new booking (with automatic POS transaction creation if DP > 0)
bookingsRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Zod Validation
    const parsedParams = createBookingSchema.safeParse(req.body);
    if (!parsedParams.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsedParams.error.format() 
      });
    }

    const { 
      activityPackageId, sessionTimeId, manualTime, bookingDate, 
      paxAdult, paxChild, totalAmount, depositPaid, 
      customerId, guestName, guestPhone, notes 
    } = parsedParams.data;
    
    // Generate IDs first so we can use them in the transaction
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let randomSuffix = Math.floor(1000 + Math.random() * 9000); // Wait, better collision prevention logic
    const bookingCode = `BOK-${dateStr}-${randomSuffix}-${Date.now().toString().slice(-4)}`;
    
    const balanceDue = totalAmount - depositPaid;
    
    // We execute the whole logic in a Prisma Transaction to ensure Data Consistency
    const result = await prisma.$transaction(async (tx) => {
       
       let finalSessionTimeId = sessionTimeId === 'manual' ? null : sessionTimeId;
       if (!finalSessionTimeId && manualTime) {
         let session = await tx.sessionTime.findFirst({
           where: { activityPackageId, startTime: manualTime }
         });
         if (!session) {
           session = await tx.sessionTime.create({
             data: { activityPackageId, startTime: manualTime, label: 'Manual' }
           });
         }
         finalSessionTimeId = session.id;
       }

       if (!finalSessionTimeId) {
         throw new Error('SessionTimeResolutionError');
       }

       // Make the DB booking record
       const booking = await tx.booking.create({
         data: {
           bookingCode,
           activityPackageId,
           sessionTimeId: finalSessionTimeId,
           bookingDate: new Date(bookingDate),
           status: depositPaid > 0 ? 'CONFIRMED' : 'DRAFT', // Or whatever logic you prefer
           paxAdult,
           paxChild,
           totalAmount,
           depositPaid,
           balanceDue,
           customerId,
           guestName,
           guestPhone,
           notes,
           createdBy: req.user!.id
         }
       });

       // Create the POS Transaction if DP > 0 directly here instead of sequentially in Frontend
       let posTransaction: any = null;
       if (depositPaid > 0) {
          // Verify Outlet based on Activity/User logic. Assume user has outletId from req or ActivityPackage has it.
          const packageActivity = await tx.activityPackage.findUnique({ where: { id: activityPackageId } });
          const outletIdToUse = packageActivity?.outletId;
          
          if (!outletIdToUse) throw new Error('OutletNotDetermined');

          // Generate Receipt No
           const txnDateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
           const txnRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
           const receiptNo = `INV-${txnDateStr}-${txnRandom}`;
           
           // Ensure DP product exists
           let dpProduct = await tx.product.findUnique({ where: { id: 'DP_BOOKING' } });
           if (!dpProduct) {
             let cat = await tx.category.findFirst({ where: { name: 'Others' } });
             if (!cat) cat = await tx.category.create({ data: { name: 'Others' } });
             dpProduct = await tx.product.create({
               data: { id: 'DP_BOOKING', sku: 'DP_BOOKING', name: 'Booking Deposit', price: 0, categoryId: cat.id }
             });
           }

          const posTxn = await tx.transaction.create({
              data: {
                  userId: req.user!.id,
                  customerId: customerId || null,
                  outletId: outletIdToUse,
                  subtotal: depositPaid,
                  total: depositPaid,
                  paid: depositPaid,
                  change: 0,
                  taxAmount: 0, // Assumption DP is net or tax included in package
                  discount: 0,
                  paymentMethod: 'CASH', // In real app, we should pass chosen payment method
                  receiptNo,
                  status: 'COMPLETED',
                  items: {
                      create: [{
                          productId: 'DP_BOOKING',
                          quantity: 1,
                          price: depositPaid,
                          discount: 0,
                          subtotal: depositPaid
                      }]
                  },
                  payments: {
                      create: [{ method: 'CASH', amount: depositPaid }]
                  }
              }
          });
          posTransaction = posTxn;
          
          // Settle the booking immediately link to Txn
          await tx.booking.update({
             where: { id: booking.id },
             data: { transactionId: posTxn.id }
          });
       }

       return { booking, posTransaction };
    });
    
    // Explicit return for frontend
    res.status(201).json({ 
       ...result.booking,
       transactionId: result.posTransaction?.id,
       isLinkedWithPOS: !!result.posTransaction,
       transactionData: result.posTransaction
    });

  } catch (error: any) {
    console.error(error);
    if (error.message === 'SessionTimeResolutionError') {
       return res.status(400).json({ error: 'Failed to resolve session time' });
    }
    res.status(500).json({ error: error.message || 'Server error', stack: error.stack });
  }
});

// Check-in
bookingsRouter.put('/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { guideId } = req.body; // Assign guide upon check-in
    
    const booking = await prisma.booking.update({
      where: { id },
      data: { 
        status: 'CHECKED_IN',
        ...(guideId && { guideId })
      }
    });
    
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single booking by ID
bookingsRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { activityPackage: true, sessionTime: true, customer: true }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settle (Process payment for balance due — creates a POS transaction)
bookingsRouter.put('/:id/settle', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod = 'CASH' } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'amountPaid harus > 0' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { activityPackage: true }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.balanceDue <= 0) return res.status(400).json({ error: 'Booking sudah lunas' });

    const result = await prisma.$transaction(async (tx) => {
      // Create POS transaction for this settlement payment
      const outletIdToUse = booking.activityPackage?.outletId;
      if (!outletIdToUse) throw new Error('OutletNotDetermined');

      const txnDateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const txnRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
      const receiptNo = `LNS-${txnDateStr}-${txnRandom}`;

      // Ensure SETTLEMENT product exists
      let settlementProduct = await tx.product.findUnique({ where: { id: 'SETTLEMENT_BOOKING' } });
      if (!settlementProduct) {
        let cat = await tx.category.findFirst({ where: { name: 'Others' } });
        if (!cat) cat = await tx.category.create({ data: { name: 'Others' } });
        settlementProduct = await tx.product.create({
          data: { id: 'SETTLEMENT_BOOKING', sku: 'SETTLEMENT_BOOKING', name: 'Pelunasan Booking', price: 0, categoryId: cat.id }
        });
      }

      const posTxn = await tx.transaction.create({
        data: {
          userId: req.user!.id,
          customerId: booking.customerId || null,
          outletId: outletIdToUse,
          subtotal: amountPaid,
          total: amountPaid,
          paid: amountPaid,
          change: 0,
          taxAmount: 0,
          discount: 0,
          paymentMethod,
          receiptNo,
          status: 'COMPLETED',
          items: {
            create: [{
              productId: 'SETTLEMENT_BOOKING',
              quantity: 1,
              price: amountPaid,
              discount: 0,
              subtotal: amountPaid,
            }]
          },
          payments: {
            create: [{ method: paymentMethod, amount: amountPaid }]
          }
        }
      });

      const newDepositPaid = booking.depositPaid + amountPaid;
      const newBalanceDue = Math.max(0, booking.balanceDue - amountPaid);
      const newStatus = newBalanceDue <= 0 ? 'COMPLETED' : 'CONFIRMED';

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          depositPaid: newDepositPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
          transactionId: posTxn.id,
        }
      });

      // Guide Commission Logic (only when fully paid)
      if (newStatus === 'COMPLETED' && updatedBooking.guideId) {
        const guide = await tx.guide.findUnique({ where: { id: updatedBooking.guideId } });
        if (guide && guide.commissionRate > 0) {
          await tx.guideCommission.create({
            data: {
              guideId: guide.id,
              bookingId: updatedBooking.id,
              amount: (updatedBooking.totalAmount * guide.commissionRate) / 100,
            }
          });
        }
      }

      return { booking: updatedBooking, posTransaction: posTxn };
    });

    res.json({
      ...result.booking,
      transactionId: result.posTransaction.id,
      isLinkedWithPOS: true,
      transactionData: result.posTransaction,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Server error', stack: error.stack });
  }
});

