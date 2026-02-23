import { createRootRouteWithContext, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { ShoppingCart, Clock, ChefHat } from 'lucide-react'

interface RouterContext { auth: ReturnType<typeof useAuth> }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // Don't show nav on login page or kiosk routes
  if (!isAuthenticated || location.pathname === '/login' || location.pathname.startsWith('/kiosk')) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      {/* Bottom nav bar */}
      <nav className="bg-slate-800 border-t border-slate-700 flex">
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            location.pathname === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          Kasir
        </Link>
        <Link
          to="/history"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            location.pathname === '/history' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Clock className="w-5 h-5" />
          Riwayat
        </Link>
        <Link
          to="/kds"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            location.pathname === '/kds' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ChefHat className="w-5 h-5" />
          Dapur
        </Link>
      </nav>
    </div>
  )
}


