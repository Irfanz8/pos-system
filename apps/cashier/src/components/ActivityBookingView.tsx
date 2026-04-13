import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import { AlertCircle, Plus, Calendar as CalendarIcon, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

import { activitiesApi, bookingsApi } from '../lib/api';
import { PackageSelector } from './booking/PackageSelector';
import { SchedulePicker } from './booking/SchedulePicker';
import { GuestForm } from './booking/GuestForm';
import { CartSummary } from './booking/CartSummary';
import { BookingCalendar } from './booking/BookingCalendar';
import { SettlementModal } from './booking/SettlementModal';

// Use a simplified frontend variation of the Zod schema
const bookingFormSchema = z.object({
  activityPackageId: z.string().min(1, 'Pilih paket wisata'),
  bookingDate: z.string().min(1, 'Tanggal diperlukan'),
  sessionTimeId: z.string().optional().nullable(),
  manualTime: z.string().optional().nullable(),
  paxAdult: z.number().min(1, 'Minimal 1 pax'),
  paxChild: z.number().min(0).default(0),
  guestName: z.string().min(1, 'Nama pemesan wajib diisi'),
  guestPhone: z.string().min(8, 'Nomor HP tidak valid'),
  depositPaid: z.number().min(0).default(0),
}).refine(data => {
  return data.sessionTimeId || data.manualTime;
}, {
  message: "Pilih jam keberangkatan",
  path: ["sessionTimeId"],
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export function ActivityBookingView({ outletId, onSuccess }: { outletId: string, onSuccess: (tx: any) => void }) {
  const [activeTab, setActiveTab] = useState<'FORM' | 'CALENDAR' | 'PENDING'>('FORM');
  const [settlingBooking, setSettlingBooking] = useState<any>(null);

  const methods = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      bookingDate: new Date().toISOString().slice(0, 10),
      activityPackageId: '',
      sessionTimeId: '',
      manualTime: '',
      paxAdult: 1,
      paxChild: 0,
      guestName: '',
      guestPhone: '',
      depositPaid: 0,
    },
    mode: 'onChange',
  });

  const { register, watch, setValue, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = methods;

  const selectedDate = watch('bookingDate');
  const selectedPackageId = watch('activityPackageId');
  const selectedSessionId = watch('sessionTimeId');
  const paxAdult = watch('paxAdult');
  const paxChild = watch('paxChild');

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ['activities', outletId],
    queryFn: async () => (await activitiesApi.getAll({ outletId })).data,
  });

  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', selectedPackageId, selectedDate],
    queryFn: async () => {
      if (!selectedPackageId || !selectedDate) return [];
      return (await activitiesApi.getAvailability(selectedPackageId, selectedDate)).data;
    },
    enabled: !!selectedPackageId && !!selectedDate,
  });

  // Fetch pending bookings (balanceDue > 0)
  const { data: pendingBookings, isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['bookings_pending', outletId],
    queryFn: async () => {
      const res = await bookingsApi.getAll({ outletId, hasPendingBalance: true });
      return res.data;
    },
    enabled: !!outletId && activeTab === 'PENDING',
  });

  // Reset session when package/date changes
  useEffect(() => {
    setValue('sessionTimeId', '');
    setValue('manualTime', '');
  }, [selectedPackageId, selectedDate, setValue]);

  // Pricing Logic Calculation
  const selectedSession = availability?.find((s: any) => s.id === selectedSessionId);
  const currentPrice = selectedSession ? selectedSession.currentPrice : (packages?.find((p: any) => p.id === selectedPackageId)?.basePrice || 0);
  const currentChildPrice = selectedSession ? selectedSession.currentChildPrice : (packages?.find((p: any) => p.id === selectedPackageId)?.childPrice || 0);
  const totalAmount = (paxAdult * currentPrice) + (paxChild * currentChildPrice);

  const onSubmit = async (data: BookingFormValues) => {
    try {
      // Create Booking Record + Transaction in a single atomic backend call
      const bookingRes = await bookingsApi.create({
        ...data,
        totalAmount,
      });

       toast.success('Reservasi & Transaksi berhasil disimpan!');
       
       // RESET the form here after user finishes checkout!
       reset();

      // If deposit > 0, it is automatically settled in the backend based on our new logic.
      if (bookingRes.data.isLinkedWithPOS) {
        onSuccess({ 
            ...bookingRes.data.transactionData, 
            isFromBooking: true 
        });
      } else {
        // Zero DP
        onSuccess({ id: bookingRes.data.bookingCode, total: 0, items: [], isZeroDP: true });
      }

    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memproses booking. Coba lagi.");
    }
  };

  const getStatusBadge = (b: any) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Belum DP', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
      CONFIRMED: { label: 'Confirmed', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
      CHECKED_IN: { label: 'Check-In', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
      COMPLETED: { label: 'Lunas', className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
    };
    const s = statusMap[b.status] || { label: b.status, className: 'bg-slate-700 text-slate-400' };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.className}`}>{s.label}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <Toaster position="top-center" theme="dark" />
      
      {/* Sub Header for Tabs Navigation */}
      <div className="flex px-4 py-3 bg-slate-900 border-b border-slate-800 gap-2 sticky top-0 z-20">
         <button onClick={() => setActiveTab('FORM')} className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide transition-all shadow flex items-center gap-2 ${activeTab === 'FORM' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><Plus className="w-4 h-4" /> Buat Reservasi</button>
         <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide transition-all shadow flex items-center gap-2 ${activeTab === 'CALENDAR' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><CalendarIcon className="w-4 h-4" /> Kalender Jadwal</button>
         <button onClick={() => { setActiveTab('PENDING'); refetchPending(); }} className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide transition-all shadow flex items-center gap-2 ${activeTab === 'PENDING' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
           <AlertTriangle className="w-4 h-4" /> Tagihan Pending
         </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
         {activeTab === 'CALENDAR' ? (
            <BookingCalendar outletId={outletId} />
         ) : activeTab === 'PENDING' ? (
            <div className="p-4 overflow-y-auto h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Tagihan Belum Lunas</h2>
                <button onClick={() => refetchPending()} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
                  <RefreshCw className={`w-4 h-4 ${loadingPending ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingPending ? (
                <div className="text-slate-400 text-center py-16 animate-pulse">Memuat data...</div>
              ) : !pendingBookings || pendingBookings.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p className="font-medium">Tidak ada tagihan pending</p>
                  <p className="text-xs mt-1">Semua booking sudah lunas!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((b: any) => (
                    <div key={b.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-400">{b.bookingCode}</span>
                          {getStatusBadge(b)}
                        </div>
                        <p className="font-semibold text-white">{b.guestName || b.customer?.name}</p>
                        <p className="text-xs text-slate-400">{b.activityPackage?.name} • {b.sessionTime?.startTime}</p>
                        <p className="text-xs text-slate-500">{new Date(b.bookingDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-slate-400">Total: {formatCurrency(b.totalAmount)}</p>
                        <p className="text-xs text-emerald-400">DP: {formatCurrency(b.depositPaid)}</p>
                        <p className="font-bold text-orange-400">{formatCurrency(b.balanceDue)}</p>
                        <p className="text-xs text-orange-400/70">sisa tagihan</p>
                        <button
                          onClick={() => setSettlingBooking(b)}
                          className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition"
                        >
                          Lunasi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
         ) : (
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-6 h-full p-4 overflow-y-auto w-full">
                {/* Left Form Panel: Katalog Paket */}
                <div className="flex-1">
                    <PackageSelector 
                      register={register} 
                      errors={errors} 
                      packages={packages || []} 
                      selectedDate={selectedDate} 
                      selectedPackageId={selectedPackageId}
                      setValue={setValue}
                      onDateChange={(val) => setValue('bookingDate', val)}
                      onPackageChange={(val) => setValue('activityPackageId', val)}
                    />
                </div>

                {/* Right Summary Panel: Konfigurator & Keranjang */}
                <div className="w-full md:w-[400px] flex flex-col gap-6">
                  {selectedPackageId ? (
                    <>
                      {/* Konfigurasi Sesi & Pax dalam satu panel sticky */}
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col gap-6">
                        <SchedulePicker 
                          loading={loadingAvailability}
                          availability={availability || []}
                          setValue={setValue}
                          watch={watch}
                        />
                        {errors.sessionTimeId && <p className="text-red-400 text-xs mt-1 -translate-y-4">{errors.sessionTimeId.message as string}</p>}
                        
                        {/* Dynamic Price Alert */}
                        {selectedSession && currentPrice !== packages?.find((p: any) => p.id === selectedPackageId)?.basePrice && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-2 text-yellow-400 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>Harga dinamis berlaku untuk sesi ini.</span>
                            </div>
                        )}

                        <GuestForm 
                          register={register}
                          errors={errors}
                          setValue={setValue}
                          watch={watch}
                        />
                      </div>

                      <CartSummary 
                        watch={watch}
                        setValue={setValue}
                        currentPrice={currentPrice}
                        currentChildPrice={currentChildPrice}
                        totalAmount={totalAmount}
                        isProcessing={isSubmitting}
                        isValid={isValid}
                      />
                    </>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-500 w-full h-ma">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="font-medium text-slate-400">Pilih paket wisata di panel kiri untuk memulai konfigurasi reservasi.</p>
                    </div>
                  )}
                </div>
              </form>
            </FormProvider>
         )}
      </div>

      {/* Settlement Modal */}
      {settlingBooking && (
        <SettlementModal
          booking={settlingBooking}
          onClose={() => setSettlingBooking(null)}
          onSuccess={(result) => {
            setSettlingBooking(null);
            if (result.transactionData) {
              onSuccess({ ...result.transactionData, isFromBooking: true, isSettlement: true });
            }
          }}
        />
      )}
    </div>
  );
}



