'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, Lock, Mail, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

type Mode = 'login' | 'reset'

export default function AdminLoginPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading || !user || !appUser) return
    if (appUser.role === 'admin' || appUser.role === 'superadmin' || appUser.role === 'employee') {
      router.replace('/admin/dashboard')
    } else {
      // cliente tentando acessar area admin
      toast.error('Acesso restrito à equipe do restaurante')
      router.replace('/menu')
    }
  }, [user, appUser, loading, router])

  if (loading || user) return <LoadingSpinner />

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Preencha e-mail e senha')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') toast.error('Muitas tentativas. Aguarde alguns minutos.')
      else toast.error('E-mail ou senha incorretos')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    if (!email) return toast.error('Informe o e-mail')
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('E-mail de recuperação enviado!')
      setMode('login')
    } catch {
      toast.error('E-mail não encontrado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Área Administrativa</h1>
          <p className="text-gray-500 text-sm mt-1">Galpão Baiano</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            {mode === 'reset' ? (
              <>
                <button onClick={() => setMode('login')} className="text-gray-500 hover:text-gray-700 transition">
                  <ChevronLeft size={20} />
                </button>
                <p className="font-semibold text-gray-700 text-sm">Recuperar senha</p>
              </>
            ) : (
              <p className="font-semibold text-gray-700 text-sm">Acesso restrito</p>
            )}
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-4">
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" placeholder="E-mail" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {mode === 'login' && (
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'} placeholder="Senha" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button onClick={() => { setMode('reset'); setPassword('') }}
                  className="text-xs text-gray-400 hover:text-amber-600 transition">
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLogin : handleReset}
              disabled={busy}
              className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>{mode === 'login' ? 'Acessar painel' : 'Enviar e-mail'} <ArrowRight size={16} /></>
              }
            </button>
          </div>
        </div>

        {/* Back */}
        <button onClick={() => router.push('/')}
          className="w-full mt-5 text-gray-600 hover:text-gray-400 text-sm text-center transition py-2">
          ← Voltar ao cardápio
        </button>
      </div>
    </div>
  )
}
