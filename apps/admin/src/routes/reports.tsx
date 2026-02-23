import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import { useState } from 'react'
import { Calendar, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export const Route = createFileRoute('/reports')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: ReportsPage,
})

function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const { data: daily } = useQuery({
    queryKey: ['reports', 'daily', date],
    queryFn: async () => (await reportsApi.daily(date)).data,
  })

  const { data: topProducts } = useQuery({
    queryKey: ['reports', 'top-products'],
    queryFn: async () => (await reportsApi.topProducts()).data,
  })

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const chartData = topProducts?.slice(0, 5).map((p: any) => ({ name: p.product?.name?.slice(0, 10), value: p.totalSold })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Laporan</h1>
        <p className="text-slate-500">Analisis penjualan</p>
      </div>

      <div className="flex gap-4 items-center">
        <Calendar className="w-5 h-5 text-slate-500" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-2">Total Penjualan</h3>
          <p className="text-3xl font-bold text-indigo-600">{formatCurrency(daily?.totalSales || 0)}</p>
          <p className="text-slate-500 text-sm mt-1">{daily?.totalTransactions || 0} transaksi</p>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Produk Terlaris</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Transaksi {date}</h3>
        <div className="space-y-2">
          {daily?.transactions?.map((tx: any) => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">{tx.user?.name}</p>
                <p className="text-sm text-slate-500">{new Date(tx.createdAt).toLocaleTimeString('id-ID')}</p>
              </div>
              <p className="font-semibold text-indigo-600">{formatCurrency(tx.total)}</p>
            </div>
          ))}
          {(!daily?.transactions?.length) && <p className="text-center text-slate-500 py-4">Belum ada transaksi</p>}
        </div>
      </div>
    </div>
  )
}
