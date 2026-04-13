import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi, categoriesApi, transactionsApi, customersApi, outletsApi, emailApi, shiftsApi, promosApi, taxesApi } from '../lib/api'
import QRCode from 'react-qr-code'
import { useAuth } from '../lib/auth'
import { useState, useEffect } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, LogOut, CreditCard, Banknote, X, Check, Wifi, WifiOff, CloudOff, RefreshCw, UserPlus, Phone, Store, Clock, Monitor, Ticket, CheckCircle2, Printer } from 'lucide-react'
import { 
  initDB, 
  saveOfflineTransaction, 
  getCachedProducts, 
  getCachedCategories,
  cacheProducts,
  cacheCategories,
  updateLocalProductStock,
  getUnsyncedCount,
} from '../lib/offline-db'
import { initSyncService, addSyncListener, autoSync } from '../lib/sync-service'
import { ActivityBookingView } from '../components/ActivityBookingView'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => { if (!context.auth.isAuthenticated) throw redirect({ to: '/login' }) },
  component: POSPage,
})

interface CartItem { id: string; name: string; price: number; quantity: number; stock: number }

function POSPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [outletId, setOutletId] = useState(user?.outletId || '')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceipt, setShowReceipt] = useState<any>(null)
  const [appMode, setAppMode] = useState<'RETAIL' | 'BOOKING'>('RETAIL')

  // Customer lookup
  const [customerPhone, setCustomerPhone] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  
  // Alert Modal State
  const [alertMsg, setAlertMsg] = useState('')
  
  // Offline state - fully automatic
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [usingCache, setUsingCache] = useState(false)

  // Shift Management
  const [currentShift, setCurrentShift] = useState<any>(null)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftCash, setShiftCash] = useState('')

  const { refetch: refetchShift } = useQuery({
    queryKey: ['currentShift'],
    queryFn: async () => {
      if (!networkOnline) return null // Cannot check shift offline
      try {
        const res = await shiftsApi.getCurrent()
        setCurrentShift(res.data)
        return res.data
      } catch (e) { return null }
    },
    enabled: !!user && networkOnline,
  })

  // Initialize offline capabilities and listeners
  useEffect(() => {
    initDB();
    initSyncService();
    
    const handleOnline = () => {
      setNetworkOnline(true);
      autoSync(); // Auto sync on reconnect
    };
    const handleOffline = () => setNetworkOnline(false);
    
    // Aggressive sync triggers
    const triggerSync = () => {
      if (navigator.onLine) {
        autoSync();
      }
      // Always refresh count
      getUnsyncedCount().then(setUnsyncedCount);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', triggerSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') triggerSync();
    });
    
    // Listen for sync status
    const unsubscribe = addSyncListener((status, count) => {
      setIsSyncing(status === 'syncing');
      if (count !== undefined) setUnsyncedCount(count);
    });
    
    // Initial check
    triggerSync();
    
    // Periodic sync check (every minute)
    const syncInterval = setInterval(triggerSync, 60000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', triggerSync);
      window.removeEventListener('visibilitychange', triggerSync);
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  const handleShiftAction = async () => {
    if (!networkOnline) {
      setAlertMsg('Shift hanya bisa dikelola saat Online');
      return;
    }
    try {
      if (currentShift) {
        // Clock Out with calculated amount
        const cashEnd = currentShift.expectedCash || 0
        await shiftsApi.clockOut(cashEnd)
        setAlertMsg('Shift berakhir. Terima kasih!')
      } else {
        // Clock In
        if (!outletId) return setAlertMsg('Pilih outlet terlebih dahulu')
        await shiftsApi.clockIn(outletId, Number(shiftCash))
        setAlertMsg('Shift dimulai. Selamat bekerja!')
      }
      setShowShiftModal(false)
      setShiftCash('')
      refetchShift()
    } catch (error) {
      setAlertMsg('Gagal memproses shift')
    }
  }

  // Fetch outlets to display current outlet name
  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => {
      if (!networkOnline) return [];
      try {
        return (await outletsApi.getAll()).data;
      } catch { return [] }
    },
    enabled: networkOnline
  })
  
  const currentOutlet = outlets?.find((o: any) => o.id === outletId)

  // Fetch taxes
  const { data: taxes } = useQuery({
    queryKey: ['taxes', outletId],
    queryFn: async () => {
      if (!networkOnline || !outletId) return [];
      try {
        return (await taxesApi.getAll({ outletId })).data;
      } catch { return [] }
    },
    enabled: networkOnline && !!outletId
  });

  // Fetch products with smart fallback
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, categoryId, outletId],
    queryFn: async () => {
      if (!outletId) return [];
      
      // Try online fetch if network is available
      if (networkOnline) {
        try {
          const res = await productsApi.getAll({ search: search || undefined, categoryId: categoryId || undefined, outletId });
          // Cache successful response
          if (res.data) {
            const cached = res.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: p.price,
              stock: p.stock,
              categoryId: p.categoryId,
              categoryName: p.category?.name || '',
              updatedAt: p.updatedAt,
            }));
            await cacheProducts(cached);
          }
          setUsingCache(false);
          return res.data;
        } catch (error) {
          console.warn('Online fetch failed, falling back to cache');
          // Fallthrough to cache
        }
      }
      
      // Fallback to cache
      setUsingCache(true);
      const cached = await getCachedProducts();
      let filtered = cached;
      if (search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      }
      if (categoryId) {
        filtered = filtered.filter(p => p.categoryId === categoryId);
      }
      return filtered;
    },
    staleTime: 30000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (networkOnline) {
        try {
          const res = await categoriesApi.getAll();
          if (res.data) await cacheCategories(res.data);
          return res.data;
        } catch (e) { /* ignore */ }
      }
      return await getCachedCategories();
    },
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const addToCart = (product: any) => {
    // Check stock online and offline
    if (product.stock <= 0) {
      setAlertMsg('Stok habis');
      return;
    }
    
    const existing = cart.find(i => i.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        setAlertMsg('Stok tidak mencukupi');
        return;
      }
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    }
    else setCart([...cart, { id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }])
  }

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        if (newQty > i.stock) {
          setAlertMsg('Stok tidak mencukupi');
          return i;
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }))
  }

  const removeFromCart = (id: string) => setCart(cart.filter(i => i.id !== id))
  
  const handleCheckoutSuccess = async (tx: any, isOffline: boolean) => {
    setShowCheckout(false);
    setCart([]);
    setShowReceipt({ ...tx, isOffline });
    
    if (isOffline) {
      setUnsyncedCount(prev => prev + 1);
      // Try to sync immediately if we actually have network but the request just failed
      if (navigator.onLine) {
        setTimeout(() => autoSync(), 2000);
      }
    }
    
    // Refresh products to update stock
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Products */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white block leading-none">POS Kasir</span>
              {currentOutlet && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <Store className="w-3 h-3" /> {currentOutlet.name}
                </span>
              )}
            </div>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-lg ml-4">
            <button onClick={() => setAppMode('RETAIL')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${appMode === 'RETAIL' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}>Retail</button>
            <button onClick={() => setAppMode('BOOKING')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${appMode === 'BOOKING' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}>Wisata</button>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {/* Online/Offline Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
              networkOnline 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}>
              {networkOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {networkOnline ? 'Online' : 'Offline Mode'}
            </div>

            {/* Sync Badge */}
            {unsyncedCount > 0 && (
              <button 
                onClick={() => autoSync()}
                disabled={!networkOnline}
                title="Klik untuk sync sekarang"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all active:scale-95 hover:shadow-md cursor-pointer ${
                  !networkOnline ? 'opacity-50 cursor-not-allowed' :
                  isSyncing ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 ring-1 ring-yellow-500/50'
                }`}
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudOff className="w-4 h-4" />}
                {isSyncing ? 'Syncing...' : `${unsyncedCount} Unsynced (Tap to Sync)`}
              </button>
            )}
            
            {usingCache && networkOnline && (
              <span className="text-xs text-slate-500">Using Cache</span>
            )}
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input type="text" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          
          {/* User Menu with Shift */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-10">
                <span className="text-xs">{user?.name?.substring(0, 2).toUpperCase()}</span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li>
                <button onClick={() => setShowShiftModal(true)} className={currentShift ? 'text-red-600' : 'text-emerald-600'}>
                  <Clock className="w-4 h-4" /> {currentShift ? 'Akhiri Shift' : 'Mulai Shift'}
                </button>
              </li>
              <li>
                <Link to="/kiosk" className="text-slate-600">
                  <Monitor className="w-4 h-4" /> Mode Kiosk
                </Link>
              </li>
              <li><div className="divider my-0"></div></li>
              <li><a onClick={() => { logout(); navigate({ to: '/login' }) }} className="text-red-600"><LogOut className="w-4 h-4" /> Keluar</a></li>
            </ul>
          </div>
        </div>

        {appMode === 'RETAIL' ? (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button onClick={() => setCategoryId('')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!categoryId ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Semua</button>
              {categories?.map((cat: any) => (
                <button key={cat.id} onClick={() => setCategoryId(cat.id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${categoryId === cat.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{cat.name}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
              {productsLoading ? (
                <p className="text-slate-400 col-span-full text-center py-10">Memuat produk...</p>
              ) : products?.map((product: any) => (
                <div 
                  key={product.id} 
                  onClick={() => product.stock > 0 && addToCart(product)} 
                  className={`bg-slate-800 p-4 rounded-xl transition-colors group ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:bg-slate-700'}`}
                >
                  <div className="aspect-square bg-slate-700 rounded-lg mb-3 overflow-hidden relative">
                     {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=No+Image'} />
                     ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs">No Image</div>
                     )}
                     {/* Stock Indicator */}
                     <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        Stok: {product.stock !== undefined ? product.stock : 0}
                     </div>
                  </div>
                  <h3 className="font-medium text-slate-200 group-hover:text-emerald-400 truncate">{product.name}</h3>
                  <p className="text-emerald-400 font-bold">{formatCurrency(product.price)}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
             <ActivityBookingView outletId={outletId} onSuccess={(tx) => setShowReceipt(tx)} />
          </div>
        )}
      </div>

      {/* Cart */}
      {appMode === 'RETAIL' && (
      <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Keranjang
          </h2>
          <p className="text-sm text-slate-400">Kasir: {user?.name}</p>
        </div>

        {/* Customer Lookup */}
        <div className="p-3 border-b border-slate-700">
          {customer ? (
            <div className="flex items-center justify-between bg-emerald-500/20 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-emerald-400">{customer.name}</p>
                <p className="text-xs text-emerald-400/70">{customer.phone} • {customer.tier} • {customer.points} poin</p>
              </div>
              <button onClick={() => { setCustomer(null); setCustomerPhone('') }} className="text-emerald-400/70 hover:text-emerald-300"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  placeholder="No. HP pelanggan"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && customerPhone.trim()) {
                      setCustomerLoading(true)
                      try {
                        const res = await customersApi.getByPhone(customerPhone.trim())
                        setCustomer(res.data)
                      } catch {
                        setCustomer(null)
                      }
                      setCustomerLoading(false)
                    }
                  }}
                  className="w-full bg-slate-700 text-white text-sm rounded-lg pl-8 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={async () => {
                  if (!customerPhone.trim()) return
                  setCustomerLoading(true)
                  try {
                    const res = await customersApi.getByPhone(customerPhone.trim())
                    setCustomer(res.data)
                  } catch {
                    setCustomer(null)
                  }
                  setCustomerLoading(false)
                }}
                disabled={customerLoading}
                className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400"
              >
                {customerLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-slate-500 py-10">Keranjang kosong</div>
          ) : cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-200">{item.name}</h4>
                <p className="text-sm text-emerald-400">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 flex items-center justify-center text-white"><Minus className="w-4 h-4" /></button>
                <span className="font-bold text-white w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white"><Plus className="w-4 h-4" /></button>
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 ml-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={cart.length === 0} 
            onClick={() => setShowCheckout(true)} 
            className="w-full btn btn-primary py-3 rounded-xl font-bold text-lg disabled:opacity-50 mt-2"
          >
            Bayar
          </button>
        </div>
      </div>
      )}

      {showCheckout && <CheckoutModal cart={cart} subtotal={total} taxes={taxes || []} onClose={() => setShowCheckout(false)} onSuccess={handleCheckoutSuccess} online={networkOnline} customerId={customer?.id} customerPoints={customer?.points || 0} outletId={outletId} />}
      {showReceipt && <ReceiptModal transaction={showReceipt} taxes={taxes || []} onClose={() => setShowReceipt(null)} />}
      {!outletId && <OutletSelectionModal onSelect={setOutletId} />}

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-800" /> <span className="text-slate-800">{currentShift ? 'Akhiri Shift' : 'Mulai Shift'}</span>
            </h3>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <p className="text-slate-500">Kasir: <span className="font-medium text-slate-800">{user?.name}</span></p>
                <p className="text-slate-500">Outlet: <span className="font-medium text-slate-800">{currentOutlet?.name || 'Belum dipilih'}</span></p>
                {currentShift && (
                  <p className="text-slate-500">Mulai: <span className="font-medium text-slate-800">{new Date(currentShift.startTime).toLocaleTimeString()}</span></p>
                )}
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-600">{currentShift ? 'Uang Kas Akhir (Cash End)' : 'Uang Kas Awal (Cash Start)'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">Rp</span>
                  <input 
                    type="number" 
                    value={currentShift ? (currentShift.expectedCash || 0) : shiftCash} 
                    onChange={(e) => setShiftCash(e.target.value)} 
                    className={`input w-full pl-10 ${currentShift ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-800'} border-slate-300`} 
                    placeholder="0"
                    disabled={!!currentShift}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowShiftModal(false)} className="btn btn-ghost flex-1 text-slate-600">Batal</button>
                <button onClick={handleShiftAction} className={`btn flex-1 ${currentShift ? 'btn-error' : 'btn-primary'}`}>
                  {currentShift ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal globally managing errors/messages inside POS */}
      <AlertModal message={alertMsg} onClose={() => setAlertMsg('')} />
    </div>
  )
}

function OutletSelectionModal({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: outlets, isLoading } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Pilih Outlet</h2>
        <p className="text-slate-400 mb-6">Silakan pilih outlet operasional Anda saat ini</p>
        
        {isLoading ? (
            <div className="flex justify-center py-4"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" /></div>
        ) : (
            <div className="space-y-3">
                {outlets?.map((o: any) => (
                    <button 
                        key={o.id} 
                        onClick={() => onSelect(o.id)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl flex items-center justify-between group transition"
                    >
                        <span className="font-medium">{o.name}</span>
                        <Check className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}

function CheckoutModal({ cart, subtotal, taxes, online, customerId, customerPoints = 0, outletId, onClose, onSuccess }: { cart: CartItem[]; subtotal: number; taxes: any[]; online: boolean; customerId?: string; customerPoints?: number; outletId: string; onClose: () => void; onSuccess: (tx: any, isOffline: boolean) => void }) {
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState<'CASH' | 'QRIS'>('CASH')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Point redemption state
  const [usePoints, setUsePoints] = useState(false)
  const [redeemedPoints, setRedeemedPoints] = useState(0)

  // Promo state
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
  
  const validatePromo = async () => {
    if (!promoCode.trim()) return
    if (!online) { setPromoError('Promo tidak bisa dipakai saat offline'); return }
    
    setIsValidatingPromo(true)
    setPromoError('')
    try {
      const res = await promosApi.validate({ code: promoCode, total: subtotal })
      setAppliedPromo(res.data.promo)
      setPromoDiscount(res.data.discount)
    } catch (err: any) {
      setPromoError(err.response?.data?.error || 'Promo tidak valid')
      setAppliedPromo(null)
      setPromoDiscount(0)
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const removePromo = () => {
    setAppliedPromo(null)
    setPromoDiscount(0)
    setPromoCode('')
  }
  
  // LOGIKA DISKON BERSUSUN & PAJAK
  const totalAfterPromo = Math.max(0, subtotal - promoDiscount)
  const pointDiscount = redeemedPoints * 100
  const totalDiscount = promoDiscount + pointDiscount
  const taxableAmount = Math.max(0, subtotal - totalDiscount)
  
  let totalInclusiveRate = 0
  let totalExclusiveRate = 0
  taxes.filter(t => t.isActive).forEach(t => {
    if (t.type === 'INCLUSIVE') totalInclusiveRate += t.rate
    if (t.type === 'EXCLUSIVE') totalExclusiveRate += t.rate
  })

  const baseAmountWithoutInclusive = totalInclusiveRate > 0 
    ? taxableAmount / (1 + (totalInclusiveRate / 100)) 
    : taxableAmount
    
  const exclusiveTaxAmount = baseAmountWithoutInclusive * (totalExclusiveRate / 100)
  const finalTotal = taxableAmount + exclusiveTaxAmount
  
  const paidNum = parseFloat(paid) || 0
  const change = paidNum - finalTotal

  const handleSubmit = async () => {
    if (paidNum < finalTotal) { setError('Pembayaran kurang'); return }
    
    setProcessing(true);
    setError('');
    
    const txData = {
      items: cart.map(i => ({ productId: i.id, name: i.name, quantity: i.quantity, price: i.price })),
      total: finalTotal,
      paid: paidNum,
      change: change,
      discount: pointDiscount + promoDiscount,
      paymentMethod: method,
      redeemPoints: redeemedPoints,
      outletId,
      customerId: customerId || undefined,
      date: new Date().toISOString(),
    };
    
    // Try online if network is available
    if (online) {
      try {
        const res = await transactionsApi.create({
          items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
          paid: paidNum,
          paymentMethod: method,
          customerId: customerId || undefined,
          redeemPoints: redeemedPoints,
          discount: pointDiscount + promoDiscount,
          outletId,
        });
        onSuccess(res.data, false);
      } catch (err: any) {
        // Only fallback if it's NOT a validation error (400) or if it's a network error (0/500/timeout)
        // Actually for a simplified "Auto" experience, we should be aggressive about saving offline
        // unless it's strictly a logic error we can catch (like stock - but we might want to allow negative stock in emergency?)
        // For now, let's assume any error => Offline Save
        
        console.log('Online failed, saving offline:', err);
        
        try {
          const offlineTx = await saveOfflineTransaction({
              ...txData,
              customerId: txData.customerId || undefined
          });
          // Update local stock
          for (const item of cart) {
            await updateLocalProductStock(item.id, item.quantity);
          }
          onSuccess({ ...offlineTx, receiptNo: `OFFLINE-${offlineTx.id}` }, true);
        } catch (offlineErr) {
          setError('Gagal menyimpan transaksi (Offline Error)');
        }
      }
    } else {
      // Save offline transaction directly
      try {
        const offlineTx = await saveOfflineTransaction({
            ...txData,
            customerId: txData.customerId || undefined
        });
        // Update local stock
        for (const item of cart) {
          await updateLocalProductStock(item.id, item.quantity);
        }
        onSuccess({ ...offlineTx, receiptNo: `OFFLINE-${offlineTx.id}` }, true);
      } catch (offlineErr) {
         setError('Gagal menyimpan transaksi (Storage Error)');
      }
    }
    
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Pembayaran</h2>
          {!online && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Mode Offline</span>}
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
          
          <div className="text-center py-4 bg-slate-900/50 rounded-xl mb-4 border border-slate-700">
            <div className="flex justify-between items-center text-slate-400 px-4 text-sm mb-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-400 px-4 text-sm mb-1">
                <span>Diskon Promo:</span>
                <span>-{formatCurrency(promoDiscount)}</span>
              </div>
            )}
            {redeemedPoints > 0 && (
              <div className="flex justify-between items-center text-yellow-400 px-4 text-sm mb-1">
                <span>Tukar {redeemedPoints} Poin:</span>
                <span>-{formatCurrency(pointDiscount)}</span>
              </div>
            )}
            {exclusiveTaxAmount > 0 && (
              <div className="border-t border-slate-700 pt-1 mt-1">
                {taxes.filter(t => t.isActive && t.type === 'EXCLUSIVE').map((t, idx) => {
                  const amount = baseAmountWithoutInclusive * (t.rate / 100);
                  return (
                    <div key={idx} className="flex justify-between items-center text-orange-400 px-4 text-sm mt-1">
                      <span>{t.name} ({t.rate}%)</span>
                      <span>+{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-700 mx-4">
               <p className="text-4xl font-bold text-white">{formatCurrency(finalTotal)}</p>
               <p className="text-xs text-slate-500 mt-1">Total Tagihan (Grand Total)</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            {/* Promo Input */}
            <div className="bg-slate-700 p-3 rounded-lg">
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-emerald-500/20 p-2 rounded border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-emerald-400">{appliedPromo.code}</p>
                      <p className="text-xs text-emerald-500/80">{appliedPromo.name}</p>
                    </div>
                  </div>
                  <button onClick={removePromo} className="text-emerald-400/50 hover:text-emerald-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Kode Promo" 
                        className="input pl-9 w-full uppercase"
                      />
                    </div>
                    <button 
                      onClick={validatePromo}
                      disabled={isValidatingPromo || !promoCode}
                      className="btn btn-primary px-4 bg-slate-600 hover:bg-slate-500 disabled:opacity-50"
                    >
                      {isValidatingPromo ? '...' : 'Cek'}
                    </button>
                  </div>
                  {promoError && <p className="text-red-400 text-xs mt-2">{promoError}</p>}
                </div>
              )}
            </div>

            {/* Points UI */}
            {customerPoints > 0 && (
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-yellow-400 flex items-center gap-1">⭐ Poin: {customerPoints}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={usePoints} onChange={(e) => {
                      setUsePoints(e.target.checked);
                      if (e.target.checked) {
                        const maxRedeemableByPrice = Math.ceil(totalAfterPromo / 100); 
                        setRedeemedPoints(Math.min(customerPoints, maxRedeemableByPrice));
                      } else {
                        setRedeemedPoints(0);
                      }
                    }} />
                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-2 text-sm text-slate-300">Tukar</span>
                  </label>
                </div>
                {usePoints && (
                   <div className="flex items-center gap-2">
                     <input 
                      type="range" 
                      min="0" 
                      max={Math.min(customerPoints, Math.ceil(totalAfterPromo / 100))} 
                      value={redeemedPoints} 
                      onChange={(e) => setRedeemedPoints(parseInt(e.target.value))}
                      className="flex-1 accent-emerald-500"
                     />
                     <span className="text-xs text-white w-12 text-right">{redeemedPoints}</span>
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setMethod('CASH')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${method === 'CASH' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}><Banknote className="w-5 h-5" /> Cash</button>
            <button onClick={() => setMethod('QRIS')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${method === 'QRIS' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}><CreditCard className="w-5 h-5" /> QRIS</button>
          </div>
          <div><label className="text-sm text-slate-400">Jumlah Bayar</label><input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="input text-2xl text-center" placeholder="0" /></div>
          {paidNum >= finalTotal && <div className="text-center p-3 bg-emerald-500/20 rounded-lg"><p className="text-emerald-400">Kembalian: {formatCurrency(change)}</p></div>}
          <button onClick={handleSubmit} disabled={processing || paidNum < finalTotal} className="w-full btn btn-primary py-3 justify-center disabled:opacity-50">{processing ? 'Memproses...' : 'Konfirmasi'}</button>
        </div>
      </div>
    </div>
  )
}

function ReceiptModal({ transaction, taxes = [], onClose }: { transaction: any; taxes?: any[]; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')
  
  const validTxId = transaction.receiptNo?.startsWith('OFFLINE') ? null : transaction.id;
  const receiptUrl = validTxId ? `${window.location.origin}/receipt/${validTxId}` : null;

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
  const isOffline = transaction.isOffline;
  
  const handleSendEmail = async () => {
    if (!email || !validTxId) return;
    setSendingEmail(true);
    try {
      await emailApi.sendReceipt(email, validTxId);
      setAlertMsg('Email berhasil dikirim!');
      setShowEmailInput(false);
    } catch (error) {
      setAlertMsg('Gagal mengirim email');
    } finally {
      setSendingEmail(false);
    }
  }

  const handleWhatsApp = () => {
    if (!validTxId) return;
    const text = `Terima kasih telah berbelanja di ${transaction.outlet?.name || 'Toko Kami'}.%0ALihat struk digital Anda di sini:%0A${receiptUrl}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* We use print-area class so that only this part is visible when window.print() is called. */}
        <div className="print-area bg-white p-6 sm:p-0">
          <div className="p-6 text-center border-b">
            <div className={`w-16 h-16 ${isOffline ? 'bg-yellow-100' : 'bg-emerald-100'} rounded-full flex items-center justify-center mx-auto mb-4 no-print`}>
              {isOffline ? <CloudOff className="w-8 h-8 text-yellow-600" /> : <Check className="w-8 h-8 text-emerald-600" />}
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {isOffline ? 'Tersimpan Offline' : 'Transaksi Berhasil!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono hidden print:block">
              {transaction.outlet?.name || 'Toko Kami'}
            </p>
            {isOffline && <p className="text-sm text-yellow-600 mt-1 no-print">Akan sync saat online</p>}
          </div>
          
          <div className="p-6 space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-500 text-sm">Total</p>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(transaction.total)}</p>
            </div>
            
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">No. Struk</span><span className="font-mono text-xs text-slate-800">{transaction.receiptNo || transaction.id}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tanggal</span><span className="text-xs text-slate-800">{new Date(transaction.date || transaction.createdAt || Date.now()).toLocaleString('id-ID')}</span></div>
            </div>

            <div className="space-y-3 py-4 border-b border-dashed border-slate-300">
              {(transaction.items || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{item.product?.name || item.name || 'Produk'}</p>
                    <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.price || (item.product?.price || 0))}</p>
                  </div>
                  <p className="font-medium text-slate-800">{formatCurrency(item.quantity * (item.price || (item.product?.price || 0)))}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 pb-4 border-b">
              {transaction.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.taxAmount > 0 ? (
                (taxes && taxes.filter((t:any) => t.type === 'EXCLUSIVE').length > 0) ? (
                  taxes.filter((t:any) => t.type === 'EXCLUSIVE').map((t: any, idx: number) => {
                    const exclusiveTaxes = taxes.filter((tx:any) => tx.type === 'EXCLUSIVE');
                    const totalExclusiveRate = exclusiveTaxes.reduce((sum:number, tx:any) => sum + tx.rate, 0);
                    const amount = totalExclusiveRate > 0 ? transaction.taxAmount * (t.rate / totalExclusiveRate) : 0;
                    return (
                      <div key={idx} className="flex justify-between text-sm text-orange-500">
                        <span>{t.name}</span>
                        <span>{formatCurrency(amount)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between text-sm text-orange-500">
                    <span>Pajak Tambahan</span>
                    <span>{formatCurrency(transaction.taxAmount)}</span>
                  </div>
                )
              ) : null}
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t mt-2">
                <span>Total Tagihan</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2"><span className="text-slate-500">Bayar ({transaction.paymentMethod})</span><span className="text-slate-800">{formatCurrency(transaction.paid)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Kembalian</span><span className="text-slate-800">{formatCurrency(transaction.change)}</span></div>
            </div>

            {/* Print Only Footer for Thermal Printer */}
            <div className="hidden print:block text-center mt-6">
              <p className="text-xs text-slate-500">Terima kasih atas kunjungan Anda!</p>
              <p className="text-[10px] text-slate-400 mt-1 pb-8">Powered by POS System</p>
            </div>

            {!isOffline && validTxId && (
              <div className="space-y-4 pt-2 no-print">
                <div className="flex justify-center">
                   <div className="bg-white p-2 rounded-lg border">
                     <QRCode value={receiptUrl || ''} size={128} />
                   </div>
                </div>
                <p className="text-center text-xs text-slate-400">Scan untuk struk digital</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleWhatsApp} className="btn btn-secondary flex items-center justify-center gap-2 text-emerald-600 hover:bg-emerald-50">
                    <span className="text-lg">💬</span> WhatsApp
                  </button>
                  <button onClick={() => setShowEmailInput(!showEmailInput)} className="btn btn-secondary flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50">
                    <span className="text-lg">✉️</span> Email
                  </button>
                </div>

                {showEmailInput && (
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      placeholder="Email pelanggan" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input text-sm"
                    />
                    <button onClick={handleSendEmail} disabled={sendingEmail || !email} className="btn btn-primary px-3">
                      {sendingEmail ? '...' : 'Kirim'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-4 no-print">
               <button onClick={() => window.print()} className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2">
                 <Printer className="w-5 h-5" /> Cetak
               </button>
               <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 transition text-white py-3 rounded-lg font-medium">
                 Selesai
               </button>
            </div>
          </div>
        </div>
      </div>
      <AlertModal message={alertMsg} onClose={() => setAlertMsg('')} />
    </div>
  )
}

export function AlertModal({ message, onClose }: { message: string, onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-6">{message}</h3>
        <button onClick={onClose} className="btn btn-primary w-full py-3 rounded-xl font-bold">
          OK
        </button>
      </div>
    </div>
  )
}
