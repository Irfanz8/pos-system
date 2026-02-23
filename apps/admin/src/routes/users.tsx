import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, outletsApi } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

export const Route = createFileRoute('/users')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: UsersPage,
})

function UsersPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.getAll()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengguna</h1>
          <p className="text-slate-500">Kelola akun admin dan kasir</p>
        </div>
        <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="btn btn-primary">
          <Plus className="w-5 h-5" /> Tambah Pengguna
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="table-header">Pengguna</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Outlet</th>
              <th className="table-header text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-indigo-600 rounded-full mx-auto"></div></td></tr>
            ) : users?.map((user: any) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="table-cell font-medium">{user.name}</td>
                <td className="table-cell text-slate-500">{user.email}</td>
                <td className="table-cell">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="table-cell text-slate-500">{user.outlet?.name || '-'}</td>
                <td className="table-cell text-right">
                  <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-2 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => confirm(`Hapus ${user.name}?`) && deleteMutation.mutate(user.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} />}
    </div>
  )
}

function UserModal({ user, onClose }: { user: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    password: '', 
    role: user?.role || 'CASHIER',
    outletId: user?.outlet?.id || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = { ...formData }
      if (!data.password && user) delete (data as any).password
      user ? await usersApi.update(user.id, data) : await usersApi.create(data)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    } catch (err: any) { setError(err.response?.data?.error || 'Gagal menyimpan') }
    finally { setIsLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{user ? 'Edit' : 'Tambah'} Pengguna</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div><label className="label">Nama</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div>
          <div><label className="label">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" required /></div>
          <div><label className="label">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" required={!user} /></div>
          <div><label className="label">Role</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input"><option value="CASHIER">Kasir</option><option value="ADMIN">Admin</option></select></div>
          <div>
            <label className="label">Outlet</label>
            <select 
              value={formData.outletId} 
              onChange={(e) => setFormData({ ...formData, outletId: e.target.value })} 
              className="input"
            >
              <option value="">Tidak ada outlet (Pusat)</option>
              {outlets?.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">{isLoading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
