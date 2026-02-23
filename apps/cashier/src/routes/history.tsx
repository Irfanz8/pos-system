import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useState } from 'react'
import {
  Clock,
  CreditCard,
  Banknote,
  QrCode,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from 'lucide-react'

export const Route = createFileRoute('/history')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: HistoryPage,
})

function HistoryPage() {
  const { user } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-transactions'],
    queryFn: async () => {
      const res = await transactionsApi.getAll({ limit: 50 })
      return res.data
    },
    refetchInterval: 30000,
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const getMethodIcon = (m: string) => {
    if (m === 'QRIS') return QrCode
    if (m === 'CARD') return CreditCard
    return Banknote
  }

  const transactions = data?.data || data || []

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Riwayat Transaksi</h1>
            <p className="text-sm text-slate-400">Kasir: {user?.name}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => {
              const Icon = getMethodIcon(tx.paymentMethod)
              const isExpanded = expandedId === tx.id
              return (
                <div key={tx.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{formatCurrency(tx.total)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(tx.createdAt).toLocaleString('id-ID')} • {tx.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{(tx.receiptNo || tx.id)?.slice(-8)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-700 pt-3">
                      {(tx.items || []).map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-300">{item.product?.name || 'Produk'} x{item.quantity}</span>
                          <span className="text-slate-400">{formatCurrency(item.subtotal || item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
                        {tx.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Diskon</span>
                            <span className="text-red-400">-{formatCurrency(tx.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-300">Total</span>
                          <span className="text-emerald-400">{formatCurrency(tx.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Bayar</span>
                          <span className="text-slate-300">{formatCurrency(tx.paid)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Kembalian</span>
                          <span className="text-slate-300">{formatCurrency(tx.change)}</span>
                        </div>
                        {tx.customer && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Pelanggan</span>
                            <span className="text-indigo-400">{tx.customer.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
