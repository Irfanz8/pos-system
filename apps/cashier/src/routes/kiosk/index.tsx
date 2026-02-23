import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Utensils } from 'lucide-react'

export const Route = createFileRoute('/kiosk/')({
  beforeLoad: ({ context }) => { if (!context.auth.isAuthenticated) throw redirect({ to: '/login' }) },
  component: KioskLanding,
})

function KioskLanding() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30">
          <Utensils className="w-16 h-16 text-white" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
          Selamat Datang
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-12">
          Silakan pesan makanan & minuman favorit Anda di sini
        </p>

        <Link 
          to="/kiosk/menu" 
          className="w-full max-w-md bg-white text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all text-2xl font-bold py-6 rounded-2xl shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 group"
        >
          <span>Mulai Pesan</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      <div className="absolute bottom-8 left-0 w-full text-center text-slate-500 text-sm">
        Sentuh layar untuk memulai
      </div>
    </div>
  )
}
