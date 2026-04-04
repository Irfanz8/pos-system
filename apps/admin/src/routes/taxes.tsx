import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { taxesApi, outletsApi } from '../lib/api'
import { useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Building,
  Receipt,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/taxes')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: TaxesPage,
})

function TaxesPage() {
  const queryClient = useQueryClient()
  const [outletId, setOutletId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<any>(null)

  const { data: taxes, isLoading } = useQuery({
    queryKey: ['taxes', outletId],
    queryFn: async () => {
      const res = await taxesApi.getAll(outletId ? { outletId } : undefined)
      return res.data
    },
  })

  const { data: outletsData } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  const handleOpenModal = (tax: any = null) => {
    setEditingTax(tax)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus pajak ini?')) return
    try {
      await taxesApi.delete(id)
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      toast.success('Pajak berhasil dihapus')
    } catch (err) {
      toast.error('Gagal menghapus pajak')
    }
  }

  const getOutletName = (id: string) => {
    return outletsData?.find((o: any) => o.id === id)?.name || id
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pajak & Biaya Tambahan</h1>
          <p className="text-slate-500">Kelola PPN, PB1, dan Service Charge</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Pajak
        </button>
      </div>

      <div className="flex items-center gap-2">
         <span className="text-sm font-medium text-slate-600">Filter Outlet:</span>
         <select 
           className="input w-48"
           value={outletId}
           onChange={(e) => setOutletId(e.target.value)}
         >
           <option value="">Semua Outlet</option>
           {outletsData?.map((o: any) => (
             <option key={o.id} value={o.id}>{o.name}</option>
           ))}
         </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama Pajak</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Outlet</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Persentase</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : taxes?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    Belum ada pengaturan pajak
                  </td>
                </tr>
              ) : (
                taxes?.map((tax: any) => (
                  <tr key={tax.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{tax.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-500" />
                        {getOutletName(tax.outletId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-indigo-600">{tax.rate}%</td>
                    <td className="px-6 py-4">
                      {tax.type === 'INCLUSIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Termasuk (Inclusive)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Belum Termasuk (Exclusive)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {tax.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(tax)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tax.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <TaxModal 
          tax={editingTax} 
          outlets={outletsData}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  )
}

function TaxModal({ tax, outlets, onClose }: { tax: any, outlets: any[], onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: tax?.name || '',
    rate: tax?.rate || '',
    type: tax?.type || 'EXCLUSIVE',
    isActive: tax ? tax.isActive : true,
    outletId: tax?.outletId || (outlets?.[0]?.id || '')
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tax) {
        await taxesApi.update(tax.id, formData)
        toast.success('Pajak diupdate')
      } else {
        await taxesApi.create(formData)
        toast.success('Pajak ditambahkan')
      }
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan pajak')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {tax ? 'Edit Pajak' : 'Tambah Pajak'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Outlet</label>
            <select
              required
              value={formData.outletId}
              onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
              className="input w-full"
            >
              <option value="">Pilih Outlet</option>
              {outlets?.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pajak / Biaya</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="Contoh: PB1, PPN, Service Charge"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Persentase (%)</label>
            <input
              type="number"
              step="0.1"
              required
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
              className="input w-full"
              placeholder="Contoh: 10 atau 11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Pajak</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'EXCLUSIVE' })}
                className={`py-2 px-3 text-sm font-medium rounded-lg border ${
                  formData.type === 'EXCLUSIVE' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                + Exclusive
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'INCLUSIVE' })}
                className={`py-2 px-3 text-sm font-medium rounded-lg border ${
                  formData.type === 'INCLUSIVE' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inclusive
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formData.type === 'EXCLUSIVE' 
                ? 'Pajak akan ditambahkan di luar/di atas harga produk (Sering dipakai F&B / Resto).' 
                : 'Pajak sudah termasuk di dalam harga produk (Sering dipakai Retail / Minimarket).'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Aktif</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
