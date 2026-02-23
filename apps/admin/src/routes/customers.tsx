import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Users, X, Star, Phone } from 'lucide-react'

export const Route = createFileRoute('/customers')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: CustomersPage,
})

function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [showPoints, setShowPoints] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, tierFilter],
    queryFn: async () => {
      const res = await customersApi.getAll({ search: search || undefined, tier: tierFilter || undefined })
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  const tierColors: Record<string, string> = {
    BRONZE: 'bg-orange-100 text-orange-700',
    SILVER: 'bg-slate-200 text-slate-700',
    GOLD: 'bg-yellow-100 text-yellow-700',
    PLATINUM: 'bg-purple-100 text-purple-700',
  }

  const tierEmojis: Record<string, string> = {
    BRONZE: '🥉',
    SILVER: '🥈',
    GOLD: '🥇',
    PLATINUM: '💎',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pelanggan</h1>
          <p className="text-slate-500">Kelola data pelanggan & loyalty program</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true) }} className="btn btn-primary">
          <Plus className="w-5 h-5" /> Tambah Pelanggan
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Cari nama / telepon..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="input md:w-48">
          <option value="">Semua Tier</option>
          <option value="BRONZE">🥉 Bronze</option>
          <option value="SILVER">🥈 Silver</option>
          <option value="GOLD">🥇 Gold</option>
          <option value="PLATINUM">💎 Platinum</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="table-header">Pelanggan</th>
                <th className="table-header">Telepon</th>
                <th className="table-header">Tier</th>
                <th className="table-header">Poin</th>
                <th className="table-header">Bergabung</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div></td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada pelanggan</p></td></tr>
              ) : (
                data?.data?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-indigo-600">{c.name?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell"><span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {c.phone}</span></td>
                    <td className="table-cell"><span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColors[c.tier]}`}>{tierEmojis[c.tier]} {c.tier}</span></td>
                    <td className="table-cell">
                      <button onClick={() => setShowPoints(c)} className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-semibold">
                        <Star className="w-4 h-4" /> {c.points}
                      </button>
                    </td>
                    <td className="table-cell text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingCustomer(c); setIsModalOpen(true) }} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm(`Hapus pelanggan "${c.name}"?`)) deleteMutation.mutate(c.id) }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <CustomerModal customer={editingCustomer} onClose={() => setIsModalOpen(false)} />}
      {showPoints && <PointsModal customer={showPoints} onClose={() => setShowPoints(null)} />}
    </div>
  )
}

function CustomerModal({ customer, onClose }: { customer: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (customer) {
        await customersApi.update(customer.id, formData)
      } else {
        await customersApi.create(formData)
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] })
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
          <h2 className="text-lg font-semibold">{customer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Nama</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">No. Telepon</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Email (opsional)</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />
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

function PointsModal({ customer, onClose }: { customer: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'add' | 'redeem'>('add')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return
    setLoading(true)
    setError('')
    try {
      await customersApi.addPoints(customer.id, parseInt(amount), type)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Kelola Poin</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
            <p className="text-sm text-slate-500">{customer.name}</p>
            <p className="text-3xl font-bold text-yellow-600 flex items-center justify-center gap-2"><Star className="w-7 h-7" /> {customer.points}</p>
            <p className="text-xs text-slate-400 mt-1">poin saat ini</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType('add')} className={`px-3 py-2 rounded-lg text-sm font-medium ${type === 'add' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-slate-100 text-slate-600'}`}>
              ➕ Tambah Poin
            </button>
            <button type="button" onClick={() => setType('redeem')} className={`px-3 py-2 rounded-lg text-sm font-medium ${type === 'redeem' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-slate-100 text-slate-600'}`}>
              🎁 Tukar Poin
            </button>
          </div>
          <div>
            <label className="label">Jumlah Poin</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input text-center text-xl" required min="1" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? 'Memproses...' : type === 'add' ? 'Tambah' : 'Tukar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
