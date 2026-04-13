import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Plus, Compass, Clock, Users, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/activities')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ActivitiesPage,
})

function ActivitiesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  
  const [formData, setFormData] = useState({
     name: '',
     description: '',
     basePrice: '',
     childPrice: '',
     maxCapacity: '10',
     durationMinutes: '60',
  })

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', user?.outletId],
    queryFn: async () => {
      const response = await activitiesApi.getAll({ outletId: user?.outletId })
      return response.data
    },
    enabled: !!user?.outletId
  })

  const createMutation = useMutation({
     mutationFn: async (data: any) => await activitiesApi.create(data),
     onSuccess: () => {
        toast.success('Paket Baru Berhasil Ditambahkan!')
        queryClient.invalidateQueries({ queryKey: ['activities'] })
        setShowModal(false)
        setFormData({ name: '', description: '', basePrice: '', childPrice: '', maxCapacity: '10', durationMinutes: '60' })
     },
     onError: () => toast.error('Gagal menambahkan paket wisata')
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
     e.preventDefault()
     createMutation.mutate({
         ...formData,
         outletId: user?.outletId
     })
  }

  // Helper formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Paket Wisata</h1>
          <p className="text-slate-500">Kelola master data paket, sesi waktu, dan dynamic pricing</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          Tambah Paket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))
        ) : activities?.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
               <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <p>Belum ada Data Paket Wisata.</p>
            </div>
          </div>
        ) : (
          activities?.map((pkg: any) => (
            <div key={pkg.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-800">{pkg.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{pkg.description || 'Tidak ada deskripsi'}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Users className="w-4 h-4"/> Kapasitas Maks</span>
                    <span className="font-medium text-slate-700">{pkg.maxCapacity} Pax</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Clock className="w-4 h-4"/> Durasi</span>
                    <span className="font-medium text-slate-700">{pkg.durationMinutes} Menit</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                     <p className="text-xs text-slate-500 mb-1">Harga Dasar</p>
                     <p className="font-bold text-indigo-600 text-lg">{formatCurrency(pkg.basePrice)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t flex flex-col gap-2">
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesi Waktu ({pkg.sessions?.length || 0})</p>
                 <div className="flex flex-wrap gap-2">
                    {pkg.sessions?.length > 0 ? pkg.sessions.map((sess: any) => (
                        <span key={sess.id} className="px-2 py-1 bg-white border rounded text-xs text-slate-600 font-medium">
                            {sess.startTime} - {sess.label}
                        </span>
                    )) : <span className="text-xs text-slate-400">Belum ada sesi</span>}
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Package Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
               <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-lg font-bold text-slate-800">Tambah Paket Wisata</h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Nama Paket *</label>
                     <input type="text" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Misal: Rafting Sungai Ayung" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                     <textarea rows={2} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Opsional..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Harga Dasar (Rp) *</label>
                        <input type="number" required value={formData.basePrice} onChange={e => setFormData(f => ({ ...f, basePrice: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Harga Anak (Opsional)</label>
                        <input type="number" value={formData.childPrice} onChange={e => setFormData(f => ({ ...f, childPrice: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas Maks Pax *</label>
                        <input type="number" required value={formData.maxCapacity} onChange={e => setFormData(f => ({ ...f, maxCapacity: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Durasi (Menit) *</label>
                        <input type="number" required value={formData.durationMinutes} onChange={e => setFormData(f => ({ ...f, durationMinutes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                     </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6 flex justify-end gap-3">
                     <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Batal</button>
                     <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                        {createMutation.isPending ? 'Menyimpan...' : 'Simpan Paket'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  )
}
