import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { stockApi, productsApi, outletsApi } from '../lib/api'
import { useState } from 'react'
import {
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  RotateCcw,

  Plus,
  X,
  ClipboardList,
} from 'lucide-react'

export const Route = createFileRoute('/stock')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: StockPage,
})

function StockPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [outletId, setOutletId] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [showOpname, setShowOpname] = useState(false)

  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', typeFilter, outletId],
    queryFn: async () => {
      const res = await stockApi.getAllMovements({ type: typeFilter || undefined, outletId: outletId || undefined })
      return res.data
    },
  })

  const typeLabels: Record<string, { label: string; color: string; icon: any }> = {
    IN: { label: 'Masuk', color: 'bg-green-100 text-green-700', icon: ArrowUpCircle },
    OUT: { label: 'Keluar', color: 'bg-red-100 text-red-700', icon: ArrowDownCircle },
    ADJUSTMENT: { label: 'Penyesuaian', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
    RETURN: { label: 'Retur', color: 'bg-yellow-100 text-yellow-700', icon: RotateCcw },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Stok</h1>
          <p className="text-slate-500">Kelola stok produk & riwayat pergerakan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowOpname(true)} className="btn btn-secondary">
            <ClipboardList className="w-5 h-5" /> Stock Opname
          </button>
          <button onClick={() => setShowAdjust(true)} className="btn btn-primary">
            <Plus className="w-5 h-5" /> Adjustment
          </button>
        </div>
      </div>

      {/* Type Filter & Outlet Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button onClick={() => setTypeFilter('')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${!typeFilter ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            Semua
            </button>
            {Object.entries(typeLabels).map(([key, val]) => (
            <button key={key} onClick={() => setTypeFilter(key)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 whitespace-nowrap ${typeFilter === key ? val.color : 'bg-slate-100 text-slate-600'}`}>
                <val.icon className="w-4 h-4" /> {val.label}
            </button>
            ))}
        </div>
        
        {/* Outlet Selector */}
        <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Filter Outlet:</span>
             <div className="w-48">
                 <OutletSelect value={outletId} onChange={setOutletId} />
             </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="table-header">Waktu</th>
                <th className="table-header">Produk</th>
                <th className="table-header">Tipe</th>
                <th className="table-header">Jumlah</th>
                <th className="table-header">Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div></td></tr>
              ) : movements?.data?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada pergerakan stok</p></td></tr>
              ) : (
                movements?.data?.map((m: any) => {
                  const t = typeLabels[m.type] || { label: m.type, color: 'bg-slate-100 text-slate-600' }
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="table-cell text-sm text-slate-500">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-500" />
                          <span className="font-medium">{m.product?.name || '-'}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{m.product?.sku}</span>
                      </td>
                      <td className="table-cell"><span className={`px-2 py-1 rounded-full text-xs font-medium ${t.color}`}>{t.label}</span></td>
                      <td className="table-cell font-semibold">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                      <td className="table-cell text-sm text-slate-500">{m.reason || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdjust && <AdjustModal onClose={() => setShowAdjust(false)} />}
      {showOpname && <OpnameModal onClose={() => setShowOpname(false)} />}
    </div>
  )
}

function AdjustModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState('')
  const [outletId, setOutletId] = useState('')
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN'>('IN')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await productsApi.getAll()).data,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) return
    setLoading(true)
    setError('')
    try {
      await stockApi.adjust({ productId, outletId, type, quantity: parseInt(quantity), reason })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Stock Adjustment</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Produk</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input" required>
              <option value="">Pilih produk</option>
              {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stok Total: {p.stock})</option>)}
            </select>
          </div>
          
          <div>
            <label className="label">Outlet</label>
             <OutletSelect value={outletId} onChange={setOutletId} required />
          </div>
          <div>
            <label className="label">Tipe</label>
            <div className="grid grid-cols-2 gap-2">
              {(['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`px-3 py-2 rounded-lg text-sm font-medium ${type === t ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-100 text-slate-600'}`}>
                  {t === 'IN' ? '📦 Masuk' : t === 'OUT' ? '📤 Keluar' : t === 'ADJUSTMENT' ? '🔄 Penyesuaian' : '↩️ Retur'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{type === 'ADJUSTMENT' ? 'Stok Aktual' : 'Jumlah'}</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" required min="0" />
          </div>
          <div>
            <label className="label">Alasan</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="Opsional" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OpnameModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<{ productId: string; actualStock: string; reason: string }[]>([])
  const [outletId, setOutletId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await productsApi.getAll()).data,
  })

  const addItem = () => setItems([...items, { productId: '', actualStock: '', reason: '' }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    if (!outletId) {
        setError('Pilih outlet terlebih dahulu')
        return
    }
    setLoading(true)
    setError('')
    try {
      await stockApi.opname(items.map(i => ({
        productId: i.productId,
        outletId,
        actualStock: parseInt(i.actualStock),
        reason: i.reason || 'Stock opname',
      })))
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Stock Opname</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="label">Outlet</label>
            <OutletSelect value={outletId} onChange={setOutletId} required />
          </div>

          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg">
              <div className="flex-1">
                <label className="label text-xs">Produk</label>
                <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="input text-sm" required>
                  <option value="">Pilih</option>
                  {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stok Total: {p.stock})</option>)}
                </select>
              </div>
              <div className="w-24">
                <label className="label text-xs">Aktual</label>
                <input type="number" value={item.actualStock} onChange={(e) => updateItem(i, 'actualStock', e.target.value)} className="input text-sm" required min="0" />
              </div>
              <div className="flex-1">
                <label className="label text-xs">Alasan</label>
                <input type="text" value={item.reason} onChange={(e) => updateItem(i, 'reason', e.target.value)} className="input text-sm" placeholder="Opsional" />
              </div>
              <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addItem} className="w-full border-2 border-dashed border-slate-300 rounded-lg py-3 text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Item
          </button>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={loading || items.length === 0} className="btn btn-primary flex-1">{loading ? 'Menyimpan...' : `Simpan (${items.length} item)`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OutletSelect({ value, onChange, required = false }: { value: string, onChange: (val: string) => void, required?: boolean }) {
  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input" required={required}>
      <option value="">Pilih Outlet</option>
      {outlets?.map((o: any) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}
