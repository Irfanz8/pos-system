import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CreditCard, Banknote, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { bookingsApi } from '../../lib/api';
import toast from 'react-hot-toast';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

interface SettlementModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export function SettlementModal({ booking, onClose, onSuccess }: SettlementModalProps) {
  const queryClient = useQueryClient();
  const [amountPaid, setAmountPaid] = useState(booking.balanceDue);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [settlementResult, setSettlementResult] = useState<any>(null);

  const settleMutation = useMutation({
    mutationFn: () => bookingsApi.settle(booking.id, { amountPaid, paymentMethod }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bookings_pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
      setSettlementResult(res.data);
      toast.success('Pelunasan berhasil!');
      onSuccess(res.data);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Gagal memproses pelunasan');
    },
  });

  const handlePrint = () => window.print();

  if (settlementResult) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white">Pelunasan Berhasil!</h2>
            <p className="text-emerald-400 text-sm mt-1 font-mono">{settlementResult.transactionData?.receiptNo}</p>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-4 print:text-black">
            <div className="bg-slate-900/60 rounded-xl p-4 space-y-3 text-sm">
              <div className="text-center border-b border-slate-700 pb-3 mb-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider">STRUK PELUNASAN BOOKING</p>
                <p className="font-mono font-bold text-white text-lg mt-1">{booking.bookingCode}</p>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tamu</span>
                <span className="font-medium text-white">{booking.guestName || booking.customer?.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Paket</span>
                <span className="font-medium text-white">{booking.activityPackage?.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Metode Bayar</span>
                <span className="font-medium text-white">{paymentMethod}</span>
              </div>
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex justify-between text-slate-300">
                  <span>Total Paket</span>
                  <span>{formatCurrency(booking.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-300 mt-1">
                  <span>DP Sebelumnya</span>
                  <span>{formatCurrency(booking.depositPaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 text-lg mt-2 pt-2 border-t border-slate-700">
                  <span>Dibayar Sekarang</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                {settlementResult.balanceDue > 0 && (
                  <div className="flex justify-between text-orange-400 text-sm mt-1">
                    <span>Sisa Hutang</span>
                    <span>{formatCurrency(settlementResult.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Proses Pelunasan</h2>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{booking.bookingCode}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Booking Summary */}
          <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Tamu</span>
              <span className="font-medium text-white">{booking.guestName || booking.customer?.name}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Paket</span>
              <span className="font-medium text-white">{booking.activityPackage?.name}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Total Paket</span>
                <span>{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>DP Dibayar</span>
                <span className="text-emerald-400">{formatCurrency(booking.depositPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-orange-400 text-base pt-1 border-t border-slate-700">
                <span>Sisa Tagihan</span>
                <span>{formatCurrency(booking.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-slate-400 block mb-2">Nominal Pembayaran</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAmountPaid(booking.balanceDue)}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${amountPaid === booking.balanceDue ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
              >
                Lunas Penuh
              </button>
              <button
                type="button"
                onClick={() => setAmountPaid(Math.round(booking.balanceDue * 0.5))}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${amountPaid === Math.round(booking.balanceDue * 0.5) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
              >
                50% Sisa
              </button>
            </div>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 focus:border-emerald-500 outline-none p-3 rounded-xl text-white text-lg font-bold"
              min={1}
              max={booking.balanceDue}
            />
            {amountPaid > booking.balanceDue && (
              <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Nominal melebihi sisa tagihan
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium text-slate-400 block mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${paymentMethod === 'CASH' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
              >
                <Banknote className="w-5 h-5" /> Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${paymentMethod === 'QRIS' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
              >
                <CreditCard className="w-5 h-5" /> QRIS
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending || amountPaid <= 0}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {settleMutation.isPending ? 'Memproses...' : `Bayar ${formatCurrency(amountPaid)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
