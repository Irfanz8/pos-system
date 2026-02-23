import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { Clock, User, Store } from 'lucide-react'

export const Route = createFileRoute('/shifts')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ShiftsPage,
})

function ShiftsPage() {
  const [outletId, setOutletId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', outletId, date],
    queryFn: async () => {
      const params: any = { startDate: date + 'T00:00:00Z', endDate: date + 'T23:59:59Z' }
      if (outletId) params.outletId = outletId
      const res = await api.get('/shifts', { params })
      return res.data
    },
  })

  // Fetch outlets for filter
  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await api.get('/outlets')).data,
  })

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" /> Riwayat Shift
          </h1>
          <p className="text-slate-500">Pantau jam kerja karyawan</p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="input"
          />
          <select 
            value={outletId} 
            onChange={(e) => setOutletId(e.target.value)} 
            className="select"
          >
            <option value="">Semua Outlet</option>
            {outlets?.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="table-header">Karyawan</th>
              <th className="table-header">Outlet</th>
              <th className="table-header">Masuk</th>
              <th className="table-header">Keluar</th>
              <th className="table-header">Durasi</th>
              <th className="table-header font-mono text-xs">Kas Awal</th>
              <th className="table-header font-mono text-xs">Kas Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto"></div></td></tr>
            ) : shifts?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Tidak ada data shift pada tanggal ini</td></tr>
            ) : shifts?.map((shift: any) => {
              const start = new Date(shift.startTime)
              const end = shift.endTime ? new Date(shift.endTime) : null
              const duration = end ? ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1) + ' jam' : 'Aktif'

              return (
                <tr key={shift.id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> {shift.user.name}
                  </td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Store className="w-3 h-3" /> {shift.outlet.name}
                    </span>
                  </td>
                  <td className="table-cell text-emerald-600 font-medium">{formatTime(shift.startTime)}</td>
                  <td className="table-cell text-red-600 font-medium">{shift.endTime ? formatTime(shift.endTime) : '-'}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${!shift.endTime ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                      {duration}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs text-slate-500">{formatCurrency(shift.cashStart)}</td>
                  <td className="table-cell font-mono text-xs text-slate-500">{shift.cashEnd ? formatCurrency(shift.cashEnd) : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
