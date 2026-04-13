import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Ticket, Banknote, X } from 'lucide-react';
import { bookingsApi, transactionsApi } from '../../lib/api';
import toast from 'react-hot-toast';

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export function BookingCalendar({ outletId }: { outletId: string }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Settle Modal State
  const [settleBooking, setSettleBooking] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['bookings_schedule', outletId, selectedDate],
    queryFn: async () => {
      const res = await bookingsApi.getAll({ outletId, date: selectedDate });
      return res.data;
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (id: string) => bookingsApi.settle(id, 'bypass-no-balance'),
    onSuccess: () => {
        toast.success('Tamu berhasil Check-in!');
        queryClient.invalidateQueries({ queryKey: ['bookings_schedule'] });
    }
  });

  const handleSettleSubmit = async () => {
     if (!settleBooking) return;
     setIsProcessing(true);
     try {
         // 1. Create a POS Transaction for the balance
         const txData = {
            items: [{ productId: 'DP_BOOKING', quantity: 1 }], 
            paid: settleBooking.balanceDue,
            paymentMethod: paymentMethod,
            outletId: outletId,
         };
         
         const txRes = await transactionsApi.create(txData);
         
         // 2. Settle the booking
         await bookingsApi.settle(settleBooking.id, txRes.data.id);
         
         toast.success('Pelunasan & Check-in Berhasil!');
         setSettleBooking(null);
         queryClient.invalidateQueries({ queryKey: ['bookings_schedule'] });
     } catch (err) {
         toast.error('Gagal melakukan pelunasan');
     } finally {
         setIsProcessing(false);
     }
  };

  // Group by Session Time
  const groupedSchedule = bookings?.reduce((acc: any, curr: any) => {
    const timeKey = curr.sessionTime?.startTime || 'Waktu Bebas';
    if (!acc[timeKey]) acc[timeKey] = [];
    acc[timeKey].push(curr);
    return acc;
  }, {});

  const displayDate = new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Header controls */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <CalendarIcon className="w-5 h-5 text-blue-400" /> Jadwal Reservasi
        </h2>
        <div className="flex items-center gap-4">
           <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white transition-colors" title="Segarkan Data"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} /></button>
           <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
             <button onClick={() => shiftDate(-1)} className="p-2 text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ colorScheme: 'dark' }} className="bg-transparent text-white font-medium outline-none px-2 text-center" />
             <button onClick={() => shiftDate(1)} className="p-2 text-slate-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
           </div>
        </div>
      </div>

      <div className="p-6">
         <p className="text-slate-400 mb-6 text-center">Jadwal Keberangkatan pada: <span className="font-bold text-slate-200">{displayDate}</span></p>

         {isLoading ? (
            <div className="flex justify-center items-center py-20">
               <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
         ) : !bookings || bookings.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
               <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
               <p className="text-slate-400 text-lg">Tidak ada tamu yang dijadwalkan pada hari ini.</p>
            </div>
         ) : (
            <div className="space-y-8">
               {Object.keys(groupedSchedule).sort().map((timeKey) => (
                  <div key={timeKey} className="relative pl-6 md:pl-0">
                     {/* Timeline Line (Hidden on mobile) */}
                     <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-slate-700 z-0"></div>
                     
                     <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start relative z-10">
                        {/* Time Marker */}
                        <div className="flex items-center gap-2 md:w-32 flex-shrink-0 bg-slate-900 py-1">
                           <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-slate-900 flex-shrink-0 hidden md:block" />
                           <span className="text-xl font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400 md:hidden" /> {timeKey}</span>
                        </div>

                        {/* Guest Cards Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 w-full">
                           {groupedSchedule[timeKey].map((b: any) => (
                              <div key={b.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col hover:border-blue-500/50 transition-colors group shadow-lg">
                                 <div className="flex justify-between items-start mb-3">
                                    <div>
                                       <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{b.guestName || (b.customer?.name)}</h3>
                                       <p className="text-slate-400 text-sm">{b.guestPhone || (b.customer?.phone)}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-md font-bold border ${b.status === 'COMPLETED' || b.status === 'CHECKED_IN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : b.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'}`}>
                                       {b.status}
                                    </span>
                                 </div>
                                 
                                 <div className="flex items-center gap-2 text-sm text-slate-300 mb-4 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                    <span className="font-bold text-blue-300">{b.activityPackage?.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-medium"><Users className="w-4 h-4" /> {b.paxAdult} Dewasa {b.paxChild > 0 && `, ${b.paxChild} Anak`}</span>
                                 </div>

                                 <div className="flex justify-between items-end border-t border-slate-700 pt-3 mb-4">
                                    <div className="text-xs text-slate-400">
                                       Kode: <span className="text-slate-300 font-mono font-bold tracking-wider">{b.bookingCode}</span>
                                    </div>
                                    <div className="text-right text-sm">
                                       {b.balanceDue > 0 ? (
                                         <div className="text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded">Sisa: {formatCurrency(b.balanceDue)}</div>
                                       ) : (
                                         <div className="text-emerald-400 font-bold flex items-center gap-1 justify-end"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Lunas</div>
                                       )}
                                    </div>
                                 </div>

                                 {/* Action Buttons at the Bottom */}
                                 <div className="mt-auto">
                                    {b.status === 'COMPLETED' || b.status === 'CHECKED_IN' ? (
                                        <div className="w-full py-2 bg-slate-700/50 text-slate-400 text-center text-sm font-bold rounded-lg border border-slate-600 border-dashed">
                                            ✓ Sudah Check-in
                                        </div>
                                    ) : b.balanceDue > 0 ? (
                                        <button onClick={() => setSettleBooking(b)} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors">
                                            <Banknote className="w-4 h-4" /> Pelunasan & Check-in
                                        </button>
                                    ) : (
                                        <button onClick={() => checkinMutation.mutate(b.id)} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors">
                                            <Ticket className="w-4 h-4" /> Konfirmasi Kedatangan
                                        </button>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Settle/Pelunasan Modal */}
      {settleBooking && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
               <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-2xl">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <Banknote className="w-5 h-5 text-orange-400" /> Pelunasan DP
                  </h3>
                  <button onClick={() => setSettleBooking(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="p-6">
                   <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-700">
                       <p className="text-slate-400 text-sm mb-1">Total Pelunasan:</p>
                       <p className="text-3xl font-bold text-orange-400">{formatCurrency(settleBooking.balanceDue)}</p>
                       <div className="mt-2 text-sm text-slate-300 font-medium">
                           Tamu: <span className="text-white">{settleBooking.guestName}</span>
                       </div>
                   </div>

                   <label className="text-sm font-medium text-slate-400 mb-2 block">Metode Pembayaran</label>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                       <button onClick={() => setPaymentMethod('CASH')} className={`py-3 rounded-lg font-bold border-2 transition-colors ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>TUNAI</button>
                       <button onClick={() => setPaymentMethod('QRIS')} className={`py-3 rounded-lg font-bold border-2 transition-colors ${paymentMethod === 'QRIS' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>QRIS</button>
                   </div>
                   
                   <button onClick={handleSettleSubmit} disabled={isProcessing} className="w-full btn btn-primary bg-emerald-500 border-none hover:bg-emerald-600 text-white font-bold py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                       {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                       {isProcessing ? 'Memproses...' : 'Selesaikan Pelunasan'}
                   </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
