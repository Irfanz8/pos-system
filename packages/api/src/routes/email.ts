import { Router } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

export const emailRouter = Router();

// Create a test account for development (Ethereal)
// In production, use real environment variables
const createTransporter = async () => {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  const testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });
};

// Memoize transporter for dev
let transporter: nodemailer.Transporter | null = null;

emailRouter.post('/send-receipt', async (req, res) => {
  const { email, transactionId } = req.body;

  if (!email || !transactionId) {
    return res.status(400).json({ error: 'Email and Transaction ID are required' });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: { include: { product: true } },
        user: true,
        outlet: true,
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!transporter) {
      transporter = await createTransporter();
    }

    const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    const itemsHtml = transaction.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product?.name || 'Item'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity} x ${formatCurrency(item.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="text-align: center; color: #10b981;">Receipt</h2>
        <p style="text-align: center; color: #64748b;">${transaction.outlet?.name || 'POS System'}</p>
        <p style="text-align: center; font-size: 12px; color: #94a3b8;">${transaction.receiptNo || transaction.id}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          ${itemsHtml}
        </table>

        <div style="border-top: 2px solid #eee; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total</span>
            <span style="font-weight: bold;">${formatCurrency(transaction.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #64748b; font-size: 14px;">
            <span>Paid</span>
            <span>${formatCurrency(transaction.paid)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #10b981; font-size: 14px;">
            <span>Change</span>
            <span>${formatCurrency(transaction.change)}</span>
          </div>
        </div>
        
        <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">Thank you for your purchase!</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: '"POS System" <no-reply@pos-system.com>',
      to: email,
      subject: `Receipt for Order ${transaction.receiptNo || transaction.id}`,
      html: html,
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    res.json({ success: true, preview: nodemailer.getTestMessageUrl(info) });
  } catch (error: any) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});
