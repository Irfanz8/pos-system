import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const waiverRouter = Router();

// Public endpoint for guest to submit digital waiver and manifest data
waiverRouter.post('/:bookingCode', async (req, res) => {
  try {
    const { bookingCode } = req.params;
    const { participants, emergencyContact } = req.body;
    
    // Ensure the array structure is passed
    if (!Array.isArray(participants)) {
      return res.status(400).json({ error: 'Participants data must be an array' });
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingCode }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or invalid QR link' });
    }
    
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot sign waiver for a cancelled booking' });
    }
    
    // Clear out old participants if guest resubmits
    await prisma.bookingParticipant.deleteMany({
        where: { bookingId: booking.id }
    });

    // Populate participant data
    const participantData = participants.map((p: any) => ({
        bookingId: booking.id,
        name: p.name,
        age: p.age ? Number(p.age) : null,
        idCardNumber: p.idCardNumber || null,
        emergencyContact: p.emergencyContact || emergencyContact || null
    }));

    if (participantData.length > 0) {
        await prisma.bookingParticipant.createMany({
            data: participantData
        });
    }

    // Mark waiver as signed
    const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: { waiverSignedAt: new Date() }
    });

    res.json({ message: 'Waiver signed successfully', waiverSignedAt: updatedBooking.waiverSignedAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
