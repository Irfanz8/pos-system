import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Check, CloudOff, Package } from 'lucide-react'

export const Route = createFileRoute('/receipt/$transactionId')({
  component: PublicReceiptPage,
})

function PublicReceiptPage() {
  const { transactionId } = Route.useParams()
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        // Use the public endpoint
        const res = await api.get(`/transactions/public/${transactionId}`)
        setTransaction(res.data)
      } catch (err) {
        setError('Gagal memuat struk. Transaksi tidak ditemukan atau ID salah.')
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [transactionId])

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
  const formatDate = (d: string) => new Date(d).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-500">Memuat struk...</div>
  
  if (error || !transaction) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CloudOff className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{transaction.outlet?.name || 'POS System'}</h1>
          <p className="text-emerald-100 text-sm">{transaction.outlet?.address}</p>
          <p className="text-emerald-100 text-sm">{transaction.outlet?.phone}</p>
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="flex justify-between items-center text-sm text-slate-500 mb-6 pb-6 border-b border-dashed">
            <div>
              <p>No. Struk</p>
              <p className="font-mono font-medium text-slate-700">{transaction.receiptNo || transaction.id}</p>
            </div>
            <div className="text-right">
              <p>Tanggal</p>
              <p className="font-medium text-slate-700">{formatDate(transaction.createdAt)}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 pb-6 border-b border-dashed">
            {transaction.items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.product?.name || item.name || 'Produk'}</p>
                  <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.price)}</p>
                </div>
                <p className="font-medium text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-8">
            <div className="flex justify-between text-slate-600">
              <p>Subtotal</p>
              <p className="font-medium">{formatCurrency(transaction.total)}</p>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <p>Diskon</p>
                <p className="font-medium">-{formatCurrency(transaction.discount)}</p>
              </div>
            )}
            <div className="flex justify-between text-slate-800 text-lg font-bold pt-4 border-t">
              <p>Total</p>
              <p>{formatCurrency(transaction.total)}</p>
            </div>
            <div className="flex justify-between text-slate-500 text-sm pt-2">
              <p>Bayar ({transaction.paymentMethod})</p>
              <p>{formatCurrency(transaction.paid)}</p>
            </div>
            <div className="flex justify-between text-emerald-600 text-sm font-medium">
              <p>Kembalian</p>
              <p>{formatCurrency(transaction.change)}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Terima kasih atas kunjungan Anda!</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500">
              <Package className="w-3 h-3" /> Powered by POS System
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
