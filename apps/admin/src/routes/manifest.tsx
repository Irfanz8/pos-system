import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Calendar as CalendarIcon, Clock, Users, FileText, CheckCircle2, Ticket, Printer, Compass } from 'lucide-react'
import { bookingsApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/manifest')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ManifestPage,
})

function ManifestPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin_manifest', user?.outletId, selectedDate],
    queryFn: async () => {
      const response = await bookingsApi.getAll({ outletId: user?.outletId, date: selectedDate })
      return response.data
    },
    enabled: !!user?.outletId
  })

  // Group by Activity and then by Session Time
  const groupedManifest = bookings?.reduce((acc: any, curr: any) => {
    const activityName = curr.activityPackage?.name || 'Paket Lainnya';
    const timeKey = curr.sessionTime?.startTime || 'Waktu Fleksibel';
    
    if (!acc[activityName]) acc[activityName] = {};
    if (!acc[activityName][timeKey]) acc[activityName][timeKey] = [];
    
    acc[activityName][timeKey].push(curr);
    return acc;
  }, {});

  const displayDate = new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
     window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manifest Harian</h1>
          <p className="text-slate-500">Lihat rekapitulasi data tamu yang berangkat hari ini</p>
        </div>
        <div className="flex items-center gap-3">
           <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border text-sm font-medium border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
           />
           <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
              <Printer className="w-4 h-4" /> Cetak Manifest
           </button>
        </div>
      </div>

      {/* Print Header (Visible only when Printing) */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
         <h1 className="text-3xl font-bold text-black uppercase tracking-wider">MANIFEST OPERASIONAL WISATA</h1>
         <p className="text-lg font-medium text-slate-800 mt-1">Tanggal Keberangkatan: {displayDate}</p>
      </div>

      {isLoading ? (
         <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            Memuat Data Manifest...
         </div>
      ) : !bookings || bookings.length === 0 ? (
         <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500 print:hidden">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg">Belum ada tamu yang dijadwalkan pada {displayDate}.</p>
         </div>
      ) : (
         <div className="space-y-8">
            {Object.keys(groupedManifest).sort().map((activityName) => (
               <div key={activityName} className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-black">
                  <div className="bg-indigo-50 p-4 border-b border-indigo-100 print:bg-white print:border-b-2 print:border-black">
                     <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2 print:text-black">
                        <Compass className="w-5 h-5 text-indigo-600 print:text-black" />
                        {activityName}
                     </h2>
                  </div>

                  <div className="divide-y divide-slate-100 print:divide-black">
                     {Object.keys(groupedManifest[activityName]).sort().map((timeKey) => {
                        const sessionBookings = groupedManifest[activityName][timeKey];
                        const totalAdults = sessionBookings.reduce((sum: number, b: any) => sum + (b.paxAdult || 0), 0);
                        const totalChildren = sessionBookings.reduce((sum: number, b: any) => sum + (b.paxChild || 0), 0);

                        return (
                           <div key={timeKey} className="p-4 sm:p-6 print:p-2">
                              {/* Session Header */}
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 border-l-4 border-indigo-500 pl-3 print:border-black">
                                 <div>
                                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1 print:text-black">
                                       <Clock className="w-4 h-4" /> Keberangkatan Sesi {timeKey}
                                    </div>
                                    <p className="text-sm text-slate-500 print:text-black">
                                       <Users className="w-3 h-3 inline-block -mt-1 mr-1" /> 
                                       Total Pax: <span className="font-bold text-slate-800 print:text-black">{totalAdults} Dewasa</span>, {totalChildren} Anak
                                    </p>
                                 </div>
                              </div>

                              {/* Guest Table */}
                              <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left print:text-xs">
                                    <thead className="bg-slate-50 text-slate-500 print:bg-transparent print:border-b print:border-black print:text-black">
                                       <tr>
                                          <th className="px-4 py-3 font-semibold">Tamu / Pihak</th>
                                          <th className="px-4 py-3 font-semibold">No. Kontak</th>
                                          <th className="px-4 py-3 font-semibold">Kode Reservasi</th>
                                          <th className="px-4 py-3 font-semibold text-center">Jml Pax</th>
                                          <th className="px-4 py-3 font-semibold">Status Tiket</th>
                                          <th className="px-4 py-3 font-semibold print:w-32">Paraf Guide</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 print:divide-black">
                                       {sessionBookings.map((b: any, index: number) => (
                                          <tr key={b.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 print:bg-white'}>
                                             <td className="px-4 py-3 font-medium text-slate-800 print:text-black">
                                                {b.guestName || b.customer?.name}
                                             </td>
                                             <td className="px-4 py-3 text-slate-500 print:text-black">
                                                {b.guestPhone || b.customer?.phone || '-'}
                                             </td>
                                             <td className="px-4 py-3 font-mono text-slate-600 print:text-black">
                                                {b.bookingCode}
                                             </td>
                                             <td className="px-4 py-3 text-center print:text-black">
                                                <span className="font-bold">{b.paxAdult}</span>
                                                {b.paxChild > 0 && <span className="text-xs text-slate-400"> +{b.paxChild}c</span>}
                                             </td>
                                             <td className="px-4 py-3 print:hidden">
                                                {b.status === 'COMPLETED' || b.status === 'CHECKED_IN' ? (
                                                   <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold border border-emerald-200">
                                                      <CheckCircle2 className="w-3 h-3" /> Check-In
                                                   </span>
                                                ) : (
                                                   <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-semibold border border-orange-200">
                                                      <Ticket className="w-3 h-3" /> Blm Datang
                                                   </span>
                                                )}
                                             </td>
                                             <td className="hidden print:table-cell px-4 py-3 font-bold uppercase">
                                                {b.status === 'COMPLETED' || b.status === 'CHECKED_IN' ? 'CHECK-IN' : 'BLM DATANG'}
                                             </td>
                                             {/* Kolom Tanda Tangan Fisik untuk Print */}
                                             <td className="px-4 py-3 border-l print:border-black">
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  )
}
