import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { Check, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/kiosk/success')({
  beforeLoad: ({ context }) => { if (!context.auth.isAuthenticated) throw redirect({ to: '/login' }) },
  component: KioskSuccess,
  validateSearch: (search: Record<string, unknown>) => ({ orderId: search.orderId as string }),
})

function KioskSuccess() {
  const { orderId } = Route.useSearch()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
            navigate({ to: '/kiosk' })
            return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-center text-white relative overflow-hidden">
        {/* Confetti / Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
           {[...Array(20)].map((_, i) => (
             <div key={i} className="absolute w-4 h-4 bg-white/20 rounded-full animate-pulse" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
           ))}
      </div>

      <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-in zoom-in duration-500">
        <Check className="w-16 h-16 text-emerald-600" strokeWidth={4} />
      </div>

      <h1 className="text-4xl md:text-5xl font-black mb-4">Pesanan Berhasil!</h1>
      <p className="text-xl opacity-90 mb-12">Terima kasih telah memesan.</p>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-12 border border-white/20 w-full max-w-sm">
        <p className="text-sm font-medium opacity-80 uppercase tracking-widest mb-2">Nomor Pesanan</p>
        <p className="text-6xl font-black font-mono tracking-tighter">
            {orderId ? orderId.slice(-4) : '####'}
        </p>
      </div>

      <p className="text-lg opacity-80 mb-20 animate-pulse">
        Silakan tunggu nomor Anda dipanggil.
      </p>

      <Link to="/kiosk" className="flex items-center gap-2 text-white/50 hover:text-white transition">
        Kembail ke Awal ({countdown}s) <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
