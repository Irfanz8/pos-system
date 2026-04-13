import { z } from 'zod';

export const createBookingSchema = z.object({
  activityPackageId: z.string().min(1, 'Activity Package is required'),
  sessionTimeId: z.string().nullable().optional(),
  manualTime: z.string().nullable().optional(),
  bookingDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  paxAdult: z.number().int().min(1, 'Minimal 1 adult pax'),
  paxChild: z.number().int().min(0).default(0),
  totalAmount: z.number().min(0, 'Total amount must be valid'),
  depositPaid: z.number().min(0, 'Deposit cannot be negative').default(0),
  customerId: z.string().optional(),
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().min(8, 'Phone number is too short').max(20, 'Phone number is too long'),
  notes: z.string().nullable().optional(),
}).refine(data => {
  return data.sessionTimeId || data.manualTime;
}, {
  message: "Either session time or manual time must be provided",
  path: ["sessionTimeId"],
});
