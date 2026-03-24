import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promosApi } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Ticket, X, Calendar, Percent, Banknote, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/promos')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: PromosPage,
})

function PromosPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<any>(null)

  const { data: promos, isLoading } = useQuery({
    queryKey: ['promos'],
    queryFn: async () => {
      const response = await promosApi.getAll()
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promos'] })
      toast.success('Promo berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus promo'),
  })

  const handleEdit = (promo: any) => {
    setEditingPromo(promo)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus promo "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Promo & Diskon</h1>
          <p className="text-slate-500">Kelola kupon promo, diskon persentase, dan penawaran</p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null)
            setIsModalOpen(true)
          }}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5 mr-1" />
          Tambah Promo
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-slate-200 rounded"></div>
            </div>
          ))
        ) : promos?.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-100">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada promo aktif</p>
          </div>
        ) : (
          promos?.map((promo: any) => (
            <div key={promo.id} className={`card hover:shadow-md transition-shadow relative ${!promo.isActive ? 'opacity-60' : ''}`}>
              {!promo.isActive && (
                <div className="absolute top-4 right-4 bg-slate-200 text-slate-500 text-xs px-2 py-1 rounded font-medium">
                  Tidak Aktif
                </div>
              )}
              {promo.isActive && new Date(promo.endDate) < new Date() && (
                <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-medium">
                  Kedaluwarsa
                </div>
              )}
              {promo.isActive && new Date(promo.endDate) >= new Date() && (
                <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded font-medium">
                  Aktif
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-orange-100 rounded-xl flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{promo.code}</h3>
                    <p className="text-sm text-slate-500 line-clamp-1">{promo.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-slate-600 gap-2">
                  {promo.type === 'PERCENTAGE' && <Percent className="w-4 h-4 text-slate-400" />}
                  {promo.type === 'NOMINAL' && <Banknote className="w-4 h-4 text-slate-400" />}
                  {promo.type === 'BUY_X_GET_Y' && <ShoppingBag className="w-4 h-4 text-slate-400" />}
                  <span className="font-medium">
                    {promo.type === 'PERCENTAGE' ? `Diskon ${promo.discountValue}%` : ''}
                    {promo.type === 'NOMINAL' ? `Potongan ${formatCurrency(promo.discountValue)}` : ''}
                    {promo.type === 'BUY_X_GET_Y' ? `Beli ${promo.buyQuantity} Gratis ${promo.getQuantity}` : ''}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-slate-500 gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 flex items-center justify-between pt-4">
                <div className="text-xs text-slate-500">
                  <span className="font-medium">{promo.usageCount}</span> digunakan
                  {promo.maxUsage ? ` / ${promo.maxUsage} limit` : ''}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id, promo.name)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <PromoModal
          promo={editingPromo}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}

function PromoModal({
  promo,
  onClose,
}: {
  promo: any
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    code: promo?.code || '',
    name: promo?.name || '',
    description: promo?.description || '',
    type: promo?.type || 'PERCENTAGE',
    discountValue: promo?.discountValue || 0,
    buyQuantity: promo?.buyQuantity || '',
    getQuantity: promo?.getQuantity || '',
    minPurchase: promo?.minPurchase || 0,
    startDate: promo?.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    endDate: promo?.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : '',
    maxUsage: promo?.maxUsage || '',
    isActive: promo ? promo.isActive : true,
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const payload: any = {
        ...formData,
        discountValue: Number(formData.discountValue),
        minPurchase: Number(formData.minPurchase),
        maxUsage: formData.maxUsage ? Number(formData.maxUsage) : null,
      }
      
      if (formData.type === 'BUY_X_GET_Y') {
        payload.buyQuantity = Number(formData.buyQuantity)
        payload.getQuantity = Number(formData.getQuantity)
      } else {
        payload.buyQuantity = null
        payload.getQuantity = null
      }

      if (promo) {
        await promosApi.update(promo.id, payload)
        toast.success('Promo berhasil diupdate')
      } else {
        await promosApi.create(payload)
        toast.success('Promo berhasil ditambahkan')
      }

      queryClient.invalidateQueries({ queryKey: ['promos'] })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan promo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold">
            {promo ? 'Edit Promo' : 'Tambah Promo Baru'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Kode Promo</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. EXTRA10"
                  required
                />
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Nama Promosi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. Diskon Akhir Tahun"
                  required
                />
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Tipe Promo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="PERCENTAGE">Diskon Persentase (%)</option>
                  <option value="NOMINAL">Potongan Nominal (Rp)</option>
                  <option value="BUY_X_GET_Y">Beli X Gratis Y</option>
                </select>
              </div>

              {formData.type === 'PERCENTAGE' && (
                <div>
                  <label className="label text-sm font-medium text-slate-700 block mb-1">Nilai Diskon (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="input w-full px-3 py-2 border rounded-lg pr-8"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                  </div>
                </div>
              )}

              {formData.type === 'NOMINAL' && (
                <div>
                  <label className="label text-sm font-medium text-slate-700 block mb-1">Potongan Harga (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="input w-full px-3 py-2 border rounded-lg pl-10"
                      min="0"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.type === 'BUY_X_GET_Y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-sm font-medium text-slate-700 block mb-1">Beli (Qty)</label>
                    <input
                      type="number"
                      value={formData.buyQuantity}
                      onChange={(e) => setFormData({ ...formData, buyQuantity: e.target.value })}
                      className="input w-full px-3 py-2 border rounded-lg"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-sm font-medium text-slate-700 block mb-1">Gratis (Qty)</label>
                    <input
                      type="number"
                      value={formData.getQuantity}
                      onChange={(e) => setFormData({ ...formData, getQuantity: e.target.value })}
                      className="input w-full px-3 py-2 border rounded-lg"
                      min="1"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Mulai Berlaku</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Berakhir Pada</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Minimal Belanja (Rp) - Opsional</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    className="input w-full px-3 py-2 border rounded-lg pl-10"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="label text-sm font-medium text-slate-700 block mb-1">Batas Penggunaan (Kuota) - Opsional</label>
                <input
                  type="number"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  className="input w-full px-3 py-2 border rounded-lg"
                  min="1"
                  placeholder="Dikosongkan jika unlimited"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Promo Aktif & Bisa Digunakan Kasir</span>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="label text-sm font-medium text-slate-700 block mb-1">Deskripsi Promo (Opsional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full px-3 py-2 border rounded-lg min-h-[80px]"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn border border-slate-200 bg-white flex-1 hover:bg-slate-50 text-slate-700 py-2 rounded-lg font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary bg-indigo-600 text-white flex-1 hover:bg-indigo-700 py-2 rounded-lg font-medium transition-colors">
              {isLoading ? 'Menyimpan...' : 'Simpan Promo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
