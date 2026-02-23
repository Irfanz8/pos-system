import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { aiApi, outletsApi } from '../lib/api'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Brain, TrendingUp, AlertTriangle, PackageSearch, Store } from 'lucide-react'

export const Route = createFileRoute('/ai-insights')({
  component: AIInsightsPage,
})

function AIInsightsPage() {
  const [outletId, setOutletId] = useState('')

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  const { data: predictions, isLoading: loadingPredictions } = useQuery({
    queryKey: ['ai-sales', outletId],
    queryFn: async () => (await aiApi.getSalesPrediction(outletId)).data,
  })

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['ai-stock', outletId],
    queryFn: async () => (await aiApi.getStockRecommendations(outletId)).data,
    enabled: !!outletId, // Only fetch if outlet is selected (or handle all outlets if backend supports)
  })

  const { data: anomalies, isLoading: loadingAnomalies } = useQuery({
    queryKey: ['ai-anomalies', outletId],
    queryFn: async () => (await aiApi.getAnomalies(outletId)).data,
  })

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  // Combine historical and predicted for chart
  const chartData = [
    ...(predictions?.historical || []).map((d: any) => ({ date: d.date, actual: d.total })),
    ...(predictions?.predictions || []).map((d: any) => ({ date: d.date, predicted: d.predicted })),
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" /> AI Insights
        </h1>
        
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-500" />
          <select 
            value={outletId} 
            onChange={(e) => setOutletId(e.target.value)}
            className="select select-sm border-slate-300"
          >
            <option value="">Semua Outlet</option>
            {outlets?.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Prediction */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Prediksi Penjualan (7 Hari)
          </h2>
          {loadingPredictions ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400">Loading AI Model...</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} interval={Math.ceil(chartData.length / 7)} />
                  <YAxis tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#64748b" name="Aktual" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" name="Prediksi AI" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Anomaly Detection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Deteksi Anomali Transaksi
          </h2>
          <div className="overflow-y-auto max-h-[300px]">
            {loadingAnomalies ? (
              <p className="text-slate-400 text-center py-10">Menganalisis data...</p>
            ) : anomalies?.length === 0 ? (
              <p className="text-slate-400 text-center py-10">Tidak ada anomali terdeteksi.</p>
            ) : (
              <table className="table w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th>Tanggal</th>
                    <th>Total</th>
                    <th>Z-Score</th>
                    <th>Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies?.map((a: any) => (
                    <tr key={a.id} className="hover:bg-red-50">
                      <td>{new Date(a.date).toLocaleDateString('id-ID')}</td>
                      <td className="font-mono">{formatCurrency(a.total)}</td>
                      <td>
                        <span className={`badge ${Math.abs(a.zScore) > 4 ? 'badge-error' : 'badge-warning'} badge-sm`}>
                          {a.zScore}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{a.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Stock Recommendations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-blue-500" /> Rekomendasi Restock (AI Based)
        </h2>
        {!outletId ? (
            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                Pilih outlet spesifik untuk melihat rekomendasi stok.
            </div>
        ) : loadingRecs ? (
            <div className="text-center py-10 text-slate-400">Menghitung velocity penjualan...</div>
        ) : recommendations?.length === 0 ? (
            <div className="text-center py-10 text-emerald-500">Stok aman! Tidak ada rekomendasi urgent.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th>Stok Saat Ini</th>
                            <th>Rata-rata Jual/Hari</th>
                            <th>Sisa Hari (Estimasi)</th>
                            <th>Alasan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recommendations?.map((r: any) => (
                            <tr key={r.productId}>
                                <td className="font-medium">{r.productName}</td>
                                <td>{r.currentStock}</td>
                                <td>{r.dailyVelocity} unit</td>
                                <td className={`${r.daysLeft < 3 ? 'text-red-500 font-bold' : 'text-orange-500'}`}>
                                    {r.daysLeft > 900 ? '> 1 Tahun' : `${r.daysLeft} Hari`}
                                </td>
                                <td><span className="badge badge-ghost badge-sm">{r.reason}</span></td>
                                <td>
                                    <button className="btn btn-xs btn-primary">Restock</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  )
}
