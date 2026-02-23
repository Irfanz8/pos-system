import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import {
  Package,
  Tags,
  Users,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Award,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export const Route = createFileRoute('/') ({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await reportsApi.dashboard()
      return response.data
    },
  })

  const { data: weeklySales } = useQuery({
    queryKey: ['weekly-sales'],
    queryFn: async () => {
      const response = await reportsApi.weeklySales()
      return response.data
    },
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const response = await reportsApi.topProducts()
      return response.data
    },
  })

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await reportsApi.lowStock(10)
      return response.data
    },
  })

  const { data: paymentBreakdown } = useQuery({
    queryKey: ['payment-breakdown'],
    queryFn: async () => {
      const response = await reportsApi.paymentBreakdown()
      return response.data
    },
  })

  const { data: comparison } = useQuery({
    queryKey: ['comparison'],
    queryFn: async () => {
      const response = await reportsApi.comparison()
      return response.data
    },
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const PAYMENT_COLORS = {
    CASH: '#22c55e',
    QRIS: '#6366f1',
    CARD: '#f97316',
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'QRIS':
        return QrCode
      case 'CARD':
        return CreditCard
      default:
        return Banknote
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Total Produk',
      value: dashboard?.totalProducts || 0,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: '#3b82f6',
    },
    {
      label: 'Total Kategori',
      value: dashboard?.totalCategories || 0,
      icon: Tags,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: '#a855f7',
    },
    {
      label: 'Total Pengguna',
      value: dashboard?.totalUsers || 0,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: '#f97316',
    },
    {
      label: 'Transaksi Hari Ini',
      value: dashboard?.todayTransactions || 0,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: '#22c55e',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Selamat datang di POS Admin Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className="w-6 h-6" style={{ color: stat.iconColor }} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Today Card with Comparison */}
      <div className="card bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100">Penjualan Hari Ini</p>
            <p className="text-3xl font-bold mt-1">
              {formatCurrency(dashboard?.todaySales || 0)}
            </p>
            {comparison && (
              <div className="flex items-center gap-2 mt-2">
                {comparison.dailyChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-300" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-300" />
                )}
                <span className={comparison.dailyChange >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {comparison.dailyChange >= 0 ? '+' : ''}{comparison.dailyChange}%
                </span>
                <span className="text-indigo-200">vs kemarin</span>
              </div>
            )}
          </div>
          <div className="bg-white/20 p-4 rounded-xl">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Penjualan Minggu Ini
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklySales || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000000}jt`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Metode Pembayaran
          </h2>
          {paymentBreakdown && paymentBreakdown.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {paymentBreakdown.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PAYMENT_COLORS[entry.method as keyof typeof PAYMENT_COLORS] || '#94a3b8'} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {paymentBreakdown.map((item: any) => {
                  const Icon = getPaymentIcon(item.method)
                  return (
                    <div key={item.method} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: PAYMENT_COLORS[item.method as keyof typeof PAYMENT_COLORS] }} />
                        <span className="text-sm text-slate-600">{item.method}</span>
                      </div>
                      <span className="text-sm font-medium">{item.count}x</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-slate-500 py-8">Belum ada transaksi hari ini</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Produk Terlaris
          </h2>
          <div className="space-y-3">
            {(topProducts || []).slice(0, 5).map((item: any, index: number) => (
              <div
                key={item.product?.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                    index === 1 ? 'bg-slate-300 text-slate-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-slate-200 text-slate-600'}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{item.product?.name}</p>
                  <p className="text-xs text-slate-500">{item.totalSold} terjual</p>
                </div>
                <p className="text-sm font-semibold text-indigo-600">
                  {formatCurrency(item.totalRevenue || 0)}
                </p>
              </div>
            ))}
            {(!topProducts || topProducts.length === 0) && (
              <p className="text-center text-slate-500 py-4">Belum ada data penjualan</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Stok Menipis
          </h2>
          <div className="space-y-3">
            {(lowStock || []).slice(0, 5).map((product: any) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-700 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category?.name}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-bold
                  ${product.stock === 0 ? 'bg-red-500 text-white' : 
                    product.stock <= 5 ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'}`}>
                  {product.stock} pcs
                </div>
              </div>
            ))}
            {(!lowStock || lowStock.length === 0) && (
              <p className="text-center text-slate-500 py-4">Semua stok aman 👍</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Transaksi Terbaru
          </h2>
          <div className="space-y-3">
            {dashboard?.recentTransactions?.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-700">{tx.user?.name}</p>
                  <p className="text-sm text-slate-500">
                    {tx._count?.items} item • {new Date(tx.createdAt).toLocaleTimeString('id-ID')}
                  </p>
                </div>
                <p className="font-semibold text-indigo-600">
                  {formatCurrency(tx.total)}
                </p>
              </div>
            ))}
            {(!dashboard?.recentTransactions || dashboard.recentTransactions.length === 0) && (
              <p className="text-center text-slate-500 py-4">
                Belum ada transaksi hari ini
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
