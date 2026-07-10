import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import { useState } from 'react'
import { Calendar, TrendingUp, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'

export const Route = createFileRoute('/reports')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: ReportsPage,
})

function ReportsPage() {
  const getFirstDayStr = () => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  }
  const getTodayStr = () => new Date().toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(getFirstDayStr())
  const [endDate, setEndDate] = useState(getTodayStr())

  const { data: daily } = useQuery({
    queryKey: ['reports', 'daily', startDate, endDate],
    queryFn: async () => (await reportsApi.daily(startDate, endDate)).data,
  })

  const { data: topProducts } = useQuery({
    queryKey: ['reports', 'top-products', startDate, endDate],
    queryFn: async () => (await reportsApi.topProducts(startDate, endDate)).data,
  })

  const handleDownloadExcel = () => {
    if (!daily || !topProducts) return
    
    // Sheet 1: Ringkasan
    const ringkasanData = [
      { Keterangan: 'Tanggal Mulai', Nilai: startDate },
      { Keterangan: 'Tanggal Akhir', Nilai: endDate },
      { Keterangan: 'Total Transaksi', Nilai: daily.totalTransactions },
      { Keterangan: 'Total Pendapatan', Nilai: daily.totalSales },
    ]
    const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData)
    
    // Sheet 2: Transaksi
    const transaksiData = daily.transactions.map((tx: any) => ({
      'No. Struk': tx.receiptNo || tx.id,
      'Waktu': new Date(tx.createdAt).toLocaleString('id-ID'),
      'Kasir': tx.user?.name || '-',
      'Pelanggan': tx.customer?.name || '-',
      'Total Item': tx.items?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0,
      'Total Penjualan': tx.total,
      'Metode Pembayaran': tx.paymentMethod,
    }))
    const wsTransaksi = XLSX.utils.json_to_sheet(transaksiData)
    
    // Sheet 3: Produk Terlaris
    const produkData = topProducts.map((p: any) => ({
      'Nama Produk': p.product?.name || '-',
      'Kategori': p.product?.category?.name || '-',
      'Gudang/Outlet': p.product?.outlet?.name || 'Pusat',
      'Total Terjual': p.totalSold,
      'Total Pendapatan': p.totalRevenue,
    }))
    const wsProduk = XLSX.utils.json_to_sheet(produkData)
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan")
    XLSX.utils.book_append_sheet(wb, wsTransaksi, "Daftar Transaksi")
    XLSX.utils.book_append_sheet(wb, wsProduk, "Produk Terlaris")
    
    XLSX.writeFile(wb, `Laporan_${startDate}_to_${endDate}.xlsx`)
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const chartData = topProducts?.slice(0, 5).map((p: any) => ({ name: p.product?.name?.slice(0, 10), value: p.totalSold })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Laporan</h1>
        <p className="text-slate-500">Analisis penjualan</p>
      </div>

      <div className="card flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex gap-4 items-center">
          <Calendar className="w-5 h-5 text-slate-500" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-auto" />
          <span className="text-slate-400">s/d</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-auto" />
        </div>
        <button onClick={handleDownloadExcel} className="btn btn-primary whitespace-nowrap">
          <Download className="w-4 h-4" /> Unduh Excel
        </button>
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
        <h3 className="font-semibold mb-4">Daftar Transaksi ({startDate} s/d {endDate})</h3>
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
