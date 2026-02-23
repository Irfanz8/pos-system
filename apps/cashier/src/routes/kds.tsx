import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

import { useAuth } from '../lib/auth'
import { useEffect, useState } from 'react'
import { ChefHat } from 'lucide-react'

export const Route = createFileRoute('/kds')({
  component: KDSPage,
})

function KDSPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['kds-orders'],
    queryFn: async () => {
      const res = await api.get('/kds')
      return res.data
    },
    refetchInterval: 5000, // Poll every 5 seconds
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.put(`/kds/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
    }
  })

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const getElapsed = (date: string) => {
    const start = new Date(date).getTime()
    const current = now.getTime()
    const diff = Math.floor((current - start) / 1000 / 60)
    return `${diff}m`
  }

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading KDS...</div>

  const pendingOrders = orders?.filter((o: any) => o.status === 'PENDING') || []
  const processingOrders = orders?.filter((o: any) => o.status === 'PROCESSING') || []
  const readyOrders = orders?.filter((o: any) => o.status === 'READY') || []

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChefHat className="text-emerald-400" />
          Kitchen Display System
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-400">Kitchen Staff</p>
            <p className="font-bold">{user?.name}</p>
          </div>
          <div className="text-xl font-mono bg-slate-800 px-3 py-1 rounded">
            {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* PENDING */}
        <Column 
          title="Pesanan Baru" 
          count={pendingOrders.length} 
          color="bg-blue-500/10 border-blue-500/30" 
          titleColor="text-blue-400"
        >
          {pendingOrders.map((order: any) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              elapsed={getElapsed(order.createdAt)} 
              time={formatTime(order.createdAt)}
              actionLabel="Mulai Masak"
              onAction={() => updateStatus.mutate({ id: order.id, status: 'PROCESSING' })}
              actionColor="bg-blue-600 hover:bg-blue-500"
            />
          ))}
        </Column>

        {/* PROCESSING */}
        <Column 
          title="Sedang Dimasak" 
          count={processingOrders.length} 
          color="bg-orange-500/10 border-orange-500/30" 
          titleColor="text-orange-400"
        >
          {processingOrders.map((order: any) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              elapsed={getElapsed(order.createdAt)} 
              time={formatTime(order.createdAt)}
              actionLabel="Selesai Masak"
              onAction={() => updateStatus.mutate({ id: order.id, status: 'READY' })}
              actionColor="bg-orange-600 hover:bg-orange-500"
            />
          ))}
        </Column>

        {/* READY */}
        <Column 
          title="Siap Disajikan" 
          count={readyOrders.length} 
          color="bg-emerald-500/10 border-emerald-500/30" 
          titleColor="text-emerald-400"
        >
          {readyOrders.map((order: any) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              elapsed={getElapsed(order.createdAt)} 
              time={formatTime(order.createdAt)}
              actionLabel="Sajikan"
              onAction={() => updateStatus.mutate({ id: order.id, status: 'COMPLETED' })}
              actionColor="bg-emerald-600 hover:bg-emerald-500"
            />
          ))}
        </Column>
      </div>
    </div>
  )
}

function Column({ title, count, children, color, titleColor }: any) {
  return (
    <div className={`flex flex-col h-full rounded-xl border ${color} bg-slate-800/50`}>
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className={`font-bold text-lg ${titleColor}`}>{title}</h2>
        <span className="bg-slate-700 px-2 py-0.5 rounded text-sm">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

function OrderCard({ order, elapsed, time, actionLabel, onAction, actionColor }: any) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xl font-bold">#{order.receiptNo?.split('-').pop()}</span>
          <p className="text-xs text-slate-400">{order.customer?.name || 'Guest'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono bg-slate-700 px-1 rounded">{time}</p>
          <p className="text-xs text-slate-400 mt-1">{elapsed}</p>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {order.items.map((item: any) => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <span className="bg-slate-700 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">{item.quantity}</span>
              {item.product.name}
            </span>
          </div>
        ))}
      </div>

      <button 
        onClick={onAction}
        className={`w-full py-2 rounded font-medium text-sm transition-colors ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  )
}
