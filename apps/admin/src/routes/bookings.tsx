import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Search, Filter, RefreshCw, CheckCircle, Clock, AlertTriangle, X, Banknote, CreditCard, CheckCircle2, Printer } from 'lucide-react';
import { bookingsApi } from '../lib/api';
import { useAuth } from '../lib/auth';

export const Route = createFileRoute('/bookings')({
  component: BookingsPage,
});

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// ─── Settlement Modal ──────────────────────────────────────────────────────────
function SettlementModal({ booking, onClose, onSuccess }: { booking: any; onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [amountPaid, setAmountPaid] = useState(booking.balanceDue);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [settled, setSettled] = useState<any>(null);

  const settleMutation = useMutation({
    mutationFn: () => bookingsApi.settle(booking.id, { amountPaid, paymentMethod }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
      setSettled(res.data);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Gagal memproses pelunasan');
    },
  });

  if (settled) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="bg-emerald-50 border-b border-emerald-100 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-slate-800">Pelunasan Berhasil!</h2>
            <p className="text-emerald-600 text-sm font-mono mt-1">{settled.transactionData?.receiptNo}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="text-center border-b border-slate-200 pb-3 mb-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider">STRUK PELUNASAN BOOKING</p>
                <p className="font-mono font-bold text-slate-800 text-lg mt-1">{booking.bookingCode}</p>
              </div>
              <div className="flex justify-between text-slate-600"><span>Tamu</span><span className="font-medium">{booking.guestName || booking.customer?.name}</span></div>
              <div className="flex justify-between text-slate-600"><span>Paket</span><span className="font-medium">{booking.activityPackage?.name}</span></div>
              <div className="border-t border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-slate-600"><span>Total Paket</span><span>{formatCurrency(booking.totalAmount)}</span></div>
                <div className="flex justify-between text-slate-600"><span>DP Sebelumnya</span><span>{formatCurrency(booking.depositPaid)}</span></div>
                <div className="flex justify-between font-bold text-emerald-600 text-base pt-1 border-t border-slate-200">
                  <span>Dibayar Sekarang</span><span>{formatCurrency(amountPaid)}</span>
                </div>
                {settled.balanceDue > 0 && (
                  <div className="flex justify-between text-orange-500 text-sm"><span>Sisa Hutang</span><span>{formatCurrency(settled.balanceDue)}</span></div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition">
                <Printer className="w-4 h-4" /> Cetak
              </button>
              <button onClick={() => { onSuccess(); onClose(); }} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition">
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Proses Pelunasan</h2>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{booking.bookingCode}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Tamu</span><span className="font-medium">{booking.guestName || booking.customer?.name}</span></div>
            <div className="flex justify-between text-slate-600"><span>Paket</span><span className="font-medium">{booking.activityPackage?.name}</span></div>
            <div className="border-t border-slate-200 pt-2 space-y-1">
              <div className="flex justify-between text-slate-500"><span>Total</span><span>{formatCurrency(booking.totalAmount)}</span></div>
              <div className="flex justify-between text-slate-500"><span>DP Dibayar</span><span className="text-emerald-600">{formatCurrency(booking.depositPaid)}</span></div>
              <div className="flex justify-between font-bold text-orange-500 text-base pt-1 border-t border-slate-200">
                <span>Sisa Tagihan</span><span>{formatCurrency(booking.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">Nominal Pembayaran</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setAmountPaid(booking.balanceDue)} className={`flex-1 py-2 rounded-lg text-sm border transition font-medium ${amountPaid === booking.balanceDue ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Lunas Penuh</button>
              <button type="button" onClick={() => setAmountPaid(Math.round(booking.balanceDue * 0.5))} className={`flex-1 py-2 rounded-lg text-sm border transition font-medium ${amountPaid === Math.round(booking.balanceDue * 0.5) ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>50% Sisa</button>
            </div>
            <input
              type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))}
              className="w-full border border-slate-300 focus:border-blue-500 outline-none p-3 rounded-xl text-slate-800 text-lg font-bold"
              min={1}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPaymentMethod('CASH')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${paymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-600'}`}>
                <Banknote className="w-5 h-5" /> Tunai
              </button>
              <button type="button" onClick={() => setPaymentMethod('QRIS')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${paymentMethod === 'QRIS' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-600'}`}>
                <CreditCard className="w-5 h-5" /> QRIS
              </button>
            </div>
          </div>

          <button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending || amountPaid <= 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {settleMutation.isPending ? 'Memproses...' : `Bayar ${formatCurrency(amountPaid)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function BookingsPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [settlingBooking, setSettlingBooking] = useState<any>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['admin_bookings', user?.outletId, selectedDate],
    queryFn: async () => {
      const res = await bookingsApi.getAll({ outletId: user?.outletId, date: selectedDate });
      return res.data;
    },
    enabled: !!user?.outletId,
  });

  const filteredBookings = bookings?.filter((b: any) =>
     b.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Reservasi</h1>
          <p className="text-slate-500 text-sm">Validasi jadwal kedatangan tamu wisata atau pantau sisa pembayaran.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => refetch()} className="p-2 border rounded-md hover:bg-slate-50 text-slate-600">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
           <div className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative w-full">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input
                    type="text" placeholder="Cari Nama Tamu atau Kode Booking..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                 />
              </div>
           </div>
           <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
                 <Calendar className="w-4 h-4 text-slate-400" />
                 <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm outline-none bg-transparent" />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                 <Filter className="w-4 h-4" /> Filter
              </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 border-b">
               <tr>
                 <th className="px-6 py-4 font-medium">KODE & WAKTU KEBERANGKATAN</th>
                 <th className="px-6 py-4 font-medium">DETAIL PELANGGAN</th>
                 <th className="px-6 py-4 font-medium">AKTIVITAS & PAX</th>
                 <th className="px-6 py-4 font-medium">STATUS</th>
                 <th className="px-6 py-4 font-medium text-right">PEMBAYARAN</th>
                 <th className="px-6 py-4 font-medium text-center">AKSI</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                     <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                     Memuat data pendaftaran...
                  </td></tr>
               ) : !filteredBookings || filteredBookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                     <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                     <p className="font-medium">Tidak ada data reservasi.</p>
                     <p className="text-xs mt-1">Coba rubah tanggal filter Anda.</p>
                  </td></tr>
               ) : (
                  filteredBookings.map((b: any) => (
                     <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* Kode & Waktu */}
                        <td className="px-6 py-4">
                           <div className="font-mono font-bold text-slate-700">{b.bookingCode}</div>
                           <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <Calendar className="w-3 h-3" /> {format(new Date(b.bookingDate), 'dd MMM yyyy', { locale: id })}
                           </div>
                           <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 mt-0.5">
                              <Clock className="w-3 h-3" /> {b.sessionTime?.startTime || 'Waktu Fleksibel'}
                           </div>
                        </td>

                        {/* Detail Pelanggan */}
                        <td className="px-6 py-4">
                           <div className="font-semibold text-slate-800">{b.guestName || b.customer?.name}</div>
                           <div className="text-slate-500 text-xs mt-1">{b.guestPhone || b.customer?.phone}</div>
                        </td>

                        {/* Aktivitas & Pax */}
                        <td className="px-6 py-4">
                           <div className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs inline-block mb-1">
                              {b.activityPackage?.name}
                           </div>
                           <div className="text-slate-500 text-xs">
                              {b.paxAdult} Dewasa {b.paxChild > 0 && `• ${b.paxChild} Anak`}
                           </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                           <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                              ${(b.status === 'COMPLETED' || b.status === 'CHECKED_IN') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                b.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                b.status === 'CANCELED' ? 'bg-red-50 text-red-600 border border-red-200' :
                                'bg-orange-50 text-orange-600 border border-orange-200'}`}
                           >
                              {(b.status === 'COMPLETED' || b.status === 'CHECKED_IN') && <CheckCircle className="w-3 h-3" />}
                              {b.status === 'CONFIRMED' && <Clock className="w-3 h-3" />}
                              {(b.status === 'PENDING_DP' || b.status === 'DRAFT') && <AlertTriangle className="w-3 h-3" />}
                              {b.status}
                           </div>
                        </td>

                        {/* Pembayaran */}
                        <td className="px-6 py-4 text-right">
                           <div className="font-bold text-slate-800">{formatCurrency(b.totalAmount)}</div>
                           {b.balanceDue > 0 ? (
                              <div className="text-xs font-semibold text-orange-500 mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded">
                                 Hutang: {formatCurrency(b.balanceDue)}
                              </div>
                           ) : (
                              <div className="text-xs text-emerald-500 font-medium mt-1">Lunas</div>
                           )}
                           <div className="text-xs text-slate-400 mt-1">DP: {formatCurrency(b.depositPaid || 0)}</div>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-center">
                           {b.balanceDue > 0 ? (
                              <button
                                 onClick={() => setSettlingBooking(b)}
                                 className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                              >
                                 Lunasi
                              </button>
                           ) : (
                              <span className="text-xs text-slate-400">—</span>
                           )}
                        </td>
                     </tr>
                  ))
               )}
             </tbody>
           </table>
        </div>
      </div>

      {settlingBooking && (
        <SettlementModal
          booking={settlingBooking}
          onClose={() => setSettlingBooking(null)}
          onSuccess={() => {
            setSettlingBooking(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
