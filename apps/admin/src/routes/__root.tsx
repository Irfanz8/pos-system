import { createRootRouteWithContext, Outlet, Link } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  FileBarChart,
  LogOut,
  Menu,
  X,
  Warehouse,
  Heart,
  ShoppingCart,
  Ticket,
  Brain,
  Clock,
} from 'lucide-react'
import { useState } from 'react'

interface RouterContext {
  auth: ReturnType<typeof useAuth>
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { isAuthenticated, user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) {
    return <Outlet />
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Produk', icon: Package },
    { to: '/categories', label: 'Kategori', icon: Tags },
    { to: '/stock', label: 'Stok', icon: Warehouse },
    { to: '/transactions', label: 'Transaksi', icon: ShoppingCart },
    { to: '/customers', label: 'Pelanggan', icon: Heart },
    { to: '/promos', label: 'Promo', icon: Ticket },
    { to: '/users', label: 'Pengguna', icon: Users },
    { to: '/outlets', label: 'Outlet', icon: Warehouse },
    { to: '/reports', label: 'Laporan', icon: FileBarChart },
    { to: '/ai-insights', label: 'AI Insights', icon: Brain },
    { to: '/shifts', label: 'Shift', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-indigo-600">POS Admin</span>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              POS Admin
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors [&.active]:bg-indigo-50 [&.active]:text-indigo-600"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{user?.name?.[0]}</span>
            </div>
            <div>
              <p className="font-medium text-sm text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
