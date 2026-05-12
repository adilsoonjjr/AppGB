'use client'

import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Chrome } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultTab?: 'login' | 'register'
}

export default function AuthModal({ open, onClose, onSuccess, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (tab === 'register' && !form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'E-mail inválido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(form.email, form.password)
        toast.success('Bem-vindo de volta!')
      } else {
        await signUp(form.email, form.password, form.name)
        toast.success('Conta criada com sucesso!')
      }
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
        ? 'E-mail ou senha incorretos'
        : err.code === 'auth/email-already-in-use'
          ? 'Este e-mail já está cadastrado'
          : 'Erro ao entrar. Tente novamente.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Logado com Google!')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Erro ao entrar com Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Entrar na sua conta" size="sm">
      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {(['login', 'register'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setErrors({}) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            {t === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {/* Google */}
      <Button
        variant="secondary"
        className="w-full mb-4 border border-gray-200"
        onClick={handleGoogle}
        loading={googleLoading}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continuar com Google
      </Button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">ou com e-mail</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === 'register' && (
          <Input
            label="Nome completo"
            placeholder="João Silva"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            icon={<User size={15} />}
          />
        )}
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          error={errors.email}
          icon={<Mail size={15} />}
        />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Senha</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
          {tab === 'login' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        Ao entrar, você concorda com nossos termos de uso.
      </p>
    </Modal>
  )
}
