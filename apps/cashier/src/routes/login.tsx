import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { ShoppingCart, Eye, EyeOff, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) { navigate({ to: '/' }); return null }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(email, password); navigate({ to: '/' }) }
    catch (err: any) { setError(err.response?.data?.error || 'Login gagal') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">POS Kasir</h1>
          <p className="text-slate-400 mt-1">Masuk untuk mulai transaksi</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 rounded-lg text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="kasir@pos.com" required /></div>
          <div><label className="block text-sm text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary py-3 justify-center">{loading ? <><Loader2 className="w-5 h-5 animate-spin" />Memproses...</> : 'Masuk'}</button>
        </form>
        <div className="mt-6 p-3 bg-slate-700/50 rounded-lg text-center"><p className="text-slate-500 text-xs">Demo: kasir@pos.com / kasir123</p></div>
      </div>
    </div>
  )
}
