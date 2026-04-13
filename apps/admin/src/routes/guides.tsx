import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/guides')({
  component: GuidesPage,
})

function GuidesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Guide</h1>
          <p className="text-slate-500">Kelola instruktur/pemandu dan sistem komisi</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          Tambah Guide
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
        Daftar Pemandu dan Perhitungan Komisi (Terintegrasi ke /api/guides)
      </div>
    </div>
  )
}
