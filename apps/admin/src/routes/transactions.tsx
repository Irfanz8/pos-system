import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '../lib/api'
import { useState } from 'react'
import {
  ShoppingCart,

  Eye,
  Ban,
  X,
  CreditCard,
  Banknote,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export const Route = createFileRoute('/transactions')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: TransactionsPage,
})

function TransactionsPage() {

  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewTx, setViewTx] = useState<any>(null)


  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, startDate, endDate],
    queryFn: async () => {
      const res = await transactionsApi.getAll({
        page,
        limit: 15,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      return res.data
    },
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const getMethodIcon = (m: string) => {
    if (m === 'QRIS') return QrCode
    if (m === 'CARD') return CreditCard
    return Banknote
  }

  const methodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    QRIS: 'bg-indigo-100 text-indigo-700',
    CARD: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Transaksi</h1>
        <p className="text-slate-500">Riwayat semua transaksi</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row gap-4 items-end">
        <div>
          <label className="label">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} className="input" />
        </div>
        <div>
          <label className="label">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} className="input" />
        </div>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }} className="btn btn-secondary">
            <X className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="table-header">No. Struk</th>
                <th className="table-header">Waktu</th>
                <th className="table-header">Kasir</th>
                <th className="table-header">Items</th>
                <th className="table-header">Total</th>
                <th className="table-header">Metode</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div></td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={7} className="text-center py-12"><ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada transaksi</p></td></tr>
              ) : (
                data.data.map((tx: any) => {
                  const Icon = getMethodIcon(tx.paymentMethod)
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="table-cell"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{tx.receiptNo?.slice(-8)}</span></td>
                      <td className="table-cell text-sm text-slate-500">{new Date(tx.createdAt).toLocaleString('id-ID')}</td>
                      <td className="table-cell">{tx.user?.name || '-'}</td>
                      <td className="table-cell">{tx._count?.items || tx.items?.length || '-'} item</td>
                      <td className="table-cell font-semibold text-indigo-600">{formatCurrency(tx.total)}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${methodColors[tx.paymentMethod] || ''}`}>
                          <Icon className="w-3 h-3" /> {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setViewTx(tx)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Detail">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-slate-500">
              Halaman {data.pagination.page} dari {data.pagination.totalPages} ({data.pagination.total} transaksi)
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary text-sm disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.totalPages} className="btn btn-secondary text-sm disabled:opacity-50">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewTx && <TxDetailModal transaction={viewTx} onClose={() => setViewTx(null)} />}
    </div>
  )
}

function TxDetailModal({ transaction, onClose }: { transaction: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [voidReason, setVoidReason] = useState('')
  const [showVoid, setShowVoid] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: detail } = useQuery({
    queryKey: ['transaction', transaction.id],
    queryFn: async () => (await transactionsApi.getById(transaction.id)).data,
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const tx = detail || transaction

  const handleVoid = async () => {
    if (!voidReason.trim()) return
    setLoading(true)
    try {
      await transactionsApi.void(tx.id, voidReason)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      onClose()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal void transaksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Detail Transaksi</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">No. Struk</p>
              <p className="font-mono text-sm font-medium">{tx.receiptNo}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Waktu</p>
              <p className="text-sm font-medium">{new Date(tx.createdAt).toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Kasir</p>
              <p className="text-sm font-medium">{tx.user?.name || '-'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Metode</p>
              <p className="text-sm font-medium">{tx.paymentMethod}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-medium text-slate-700 mb-2">Item</h3>
            <div className="space-y-2">
              {(tx.items || []).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.product?.name || 'Produk'}</p>
                    <p className="text-xs text-slate-500">{item.quantity}x @ {formatCurrency(item.price)}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            {tx.discount > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-500">Diskon</span><span className="text-red-500">-{formatCurrency(tx.discount)}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-indigo-600">{formatCurrency(tx.total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Bayar</span><span>{formatCurrency(tx.paid)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Kembalian</span><span className="text-green-600">{formatCurrency(tx.change)}</span></div>
          </div>

          {/* Customer */}
          {tx.customer && (
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs text-indigo-500">Pelanggan</p>
              <p className="font-medium text-indigo-700">{tx.customer.name} • {tx.customer.phone}</p>
            </div>
          )}

          {/* Void */}
          {!showVoid ? (
            <button onClick={() => setShowVoid(true)} className="w-full btn btn-secondary text-red-600 hover:bg-red-50 justify-center">
              <Ban className="w-4 h-4" /> Void Transaksi
            </button>
          ) : (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-red-600">Alasan void:</p>
              <input type="text" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} className="input" placeholder="Masukkan alasan void" />
              <div className="flex gap-2">
                <button onClick={() => setShowVoid(false)} className="btn btn-secondary flex-1">Batal</button>
                <button onClick={handleVoid} disabled={loading || !voidReason.trim()} className="btn btn-primary bg-red-600 hover:bg-red-700 flex-1 disabled:opacity-50">
                  {loading ? 'Memproses...' : 'Konfirmasi Void'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
