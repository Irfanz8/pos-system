import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi, productsApi, transactionsApi } from '../../lib/api'
import { useState } from 'react'
import { ChevronLeft, Loader2, Plus, Minus, X, CreditCard, Banknote } from 'lucide-react'
import { useAuth } from '../../lib/auth'

export const Route = createFileRoute('/kiosk/menu')({
  beforeLoad: ({ context }) => { if (!context.auth.isAuthenticated) throw redirect({ to: '/login' }) },
  component: KioskMenu,
})

interface CartItem { id: string; name: string; price: number; quantity: number }

function KioskMenu() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'CASH'>('QRIS')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data,
  })

  // In a real Kiosk, we might want to filter by the Kiosk's outlet automatically or select it
  // For now we assume the logged in "Kiosk User" has an outletId
  const outletId = user?.outletId

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', selectedCategory, outletId],
    queryFn: async () => (await productsApi.getAll({ categoryId: selectedCategory, outletId })).data,
    enabled: !!outletId // Only fetch if we have an outlet (or remove if global products)
  })

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setOrderProcessing(true)
    try {
      // Create transaction
      // For Kiosk we assume paid matches total (pre-paid via QRIS or promise to pay Cash)
      const res = await transactionsApi.create({
        items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
        paid: total, 
        paymentMethod: paymentMethod,
        outletId: outletId,
        // Optional: flag as kiosk or use specific customerId
      })
      
      navigate({ to: '/kiosk/success', search: { orderId: res.data.receiptNo || res.data.id } })
    } catch (error) {
      alert('Gagal membuat pesanan. Silakan coba lagi.')
    } finally {
      setOrderProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-30">
        <Link to="/kiosk" className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition">
          <ChevronLeft className="w-8 h-8" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Menu</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Categories */}
      <div className="bg-white border-b sticky top-20 z-20 overflow-x-auto">
        <div className="flex p-4 gap-3 min-w-max">
          <button 
            onClick={() => setSelectedCategory('')}
            className={`px-6 py-3 rounded-full text-lg font-medium transition-all ${
              !selectedCategory 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          {categories?.map((cat: any) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-full text-lg font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product: any) => (
              <div key={product.id} onClick={() => addToCart(product)} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden active:scale-95 transition-transform">
                <div className="aspect-[4/3] bg-slate-100 relative">
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">No Image</div>
                    )}
                    {cart.find(i => i.id === product.id) && (
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg">
                            {cart.find(i => i.id === product.id)?.quantity}
                        </div>
                    )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{product.name}</h3>
                  <p className="text-emerald-600 font-bold text-xl">{formatCurrency(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button / Bar */}
      {cart.length > 0 && (
         <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent z-40">
            <button 
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between text-xl font-bold hover:scale-[1.02] transition-transform active:scale-95"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 w-10 h-10 rounded-full flex items-center justify-center text-sm">
                        {totalItems}
                    </div>
                    <span>Lihat Pesanan</span>
                </div>
                <span>{formatCurrency(total)}</span>
            </button>
         </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in transition">
              <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl rounded-t-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                  <div className="p-6 border-b flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-800">Pesanan Anda</h2>
                      <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {cart.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-lg text-slate-800">{item.name}</h4>
                                  <p className="text-emerald-600 font-medium">{formatCurrency(item.price)}</p>
                              </div>
                              <div className="flex items-center gap-4 bg-slate-100 rounded-xl p-1">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 active:scale-95"><Minus className="w-5 h-5" /></button>
                                  <span className="font-bold text-lg w-6 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.id, 1)} className="w-10 h-10 bg-emerald-500 text-white rounded-lg shadow-sm flex items-center justify-center active:scale-95"><Plus className="w-5 h-5" /></button>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="p-6 border-t bg-slate-50 rounded-b-3xl">
                      <div className="mb-6">
                          <h3 className="font-bold text-slate-800 mb-3">Metode Pembayaran</h3>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setPaymentMethod('QRIS')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${paymentMethod === 'QRIS' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                              >
                                  <CreditCard className="w-8 h-8" />
                                  <span className="font-bold">QRIS</span>
                              </button>
                               <button 
                                onClick={() => setPaymentMethod('CASH')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                              >
                                  <Banknote className="w-8 h-8" />
                                  <span className="font-bold">Tunai</span>
                              </button>
                          </div>
                          {paymentMethod === 'QRIS' && (
                              <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl text-center">
                                  <div className="w-48 h-48 bg-slate-200 mx-auto mb-2 flex items-center justify-center text-slate-400">
                                      QR Code Placeholder
                                  </div>
                                  <p className="text-xs text-slate-500">Scan QRIS untuk membayar</p>
                              </div>
                          )}
                           {paymentMethod === 'CASH' && (
                              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center text-yellow-800 text-sm">
                                  Silakan lakukan pembayaran di kasir setelah memesan.
                              </div>
                          )}
                      </div>

                      <div className="flex justify-between items-center text-xl font-bold text-slate-800 mb-6">
                          <span>Total Bayar</span>
                          <span className="text-3xl text-emerald-600">{formatCurrency(total)}</span>
                      </div>
                      
                      <button 
                        onClick={handleCheckout}
                        disabled={orderProcessing}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl active:scale-95 transition disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                      >
                        {orderProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
                        {orderProcessing ? 'Memproses...' : 'Konfirmasi Pesanan'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
