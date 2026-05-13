'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { setAppUser } from '@/lib/db'
import { lookupCep, formatCep } from '@/lib/delivery'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, ChevronLeft, Phone, MapPin } from 'lucide-react'

type Mode = 'login' | 'register' | 'reset'

export default function LoginPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [reg, setReg] = useState({
    name: '', email: '', password: '', phone: '',
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (loading || !user || !appUser) return
    if (appUser.role === 'admin' || appUser.role === 'superadmin' || appUser.role === 'employee') {
      router.replace('/admin/dashboard')
    } else {
      router.replace('/menu')
    }
  }, [user, appUser, loading, router])

  if (loading || user) return <LoadingSpinner />

  const go = (m: Mode) => {
    setMode(m)
    setEmail(''); setPassword('')
    setReg({ name: '', email: '', password: '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' })
    setErrors({})
  }

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Preencha e-mail e senha')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') toast.error('Muitas tentativas. Aguarde ou redefina sua senha.')
      else toast.error('E-mail ou senha incorretos')
    } finally {
      setBusy(false)
    }
  }

  const handleCepBlur = async () => {
    const clean = reg.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    const data = await lookupCep(clean)
    if (data) {
      setReg(r => ({
        ...r,
        street: data.logradouro || r.street,
        neighborhood: data.bairro || r.neighborhood,
        city: data.localidade || r.city,
        state: data.uf || r.state,
      }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const validateRegister = () => {
    const e: Record<string, string> = {}
    if (!reg.name.trim()) e.name = 'Nome obrigatório'
    if (!reg.email.trim() || !reg.email.includes('@')) e.email = 'E-mail inválido'
    if (reg.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (!reg.phone.trim() || reg.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (!reg.cep.trim() || reg.cep.replace(/\D/g, '').length < 8) e.cep = 'CEP inválido'
    if (!reg.street.trim()) e.street = 'Rua obrigatória'
    if (!reg.number.trim()) e.number = 'Número obrigatório'
    if (!reg.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório'
    if (!reg.city.trim()) e.city = 'Cidade obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validateRegister()) return
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, reg.email, reg.password)
      await setAppUser(cred.user.uid, {
        uid: cred.user.uid,
        name: reg.name.trim(),
        email: reg.email,
        phone: reg.phone,
        role: 'customer',
        savedAddresses: [{
          cep: reg.cep,
          street: reg.street,
          number: reg.number,
          complement: reg.complement,
          neighborhood: reg.neighborhood,
          city: reg.city,
          state: reg.state,
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      toast.success('Conta criada com sucesso!')
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') toast.error('E-mail já cadastrado')
      else if (e.code === 'auth/weak-password') toast.error('Senha muito fraca')
      else toast.error('Erro ao criar conta')
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
      go('login')
    } catch {
      toast.error('E-mail não encontrado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/galpao-bg.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 gap-6">

        <div className="text-center">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/20">
            <span className="text-4xl">🍲</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Galpão Baiano</h1>
          <p className="text-amber-200 text-sm mt-2 drop-shadow">Sabor baiano de verdade</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
            {mode === 'reset' ? (
              <div className="flex items-center gap-2">
                <button onClick={() => go('login')} className="text-amber-600 hover:text-amber-700 transition">
                  <ChevronLeft size={20} />
                </button>
                <p className="font-semibold text-amber-700">Recuperar senha</p>
              </div>
            ) : (
              <div className="flex gap-1 bg-amber-100 rounded-2xl p-1">
                <button onClick={() => go('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${mode === 'login' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-700'}`}>
                  Entrar
                </button>
                <button onClick={() => go('register')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${mode === 'register' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-700'}`}>
                  Criar conta
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto">

            {mode === 'login' && (
              <>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="E-mail" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} placeholder="Senha" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="text-right -mt-1">
                  <button onClick={() => go('reset')} className="text-xs text-gray-400 hover:text-amber-600 transition">
                    Esqueci minha senha
                  </button>
                </div>
                <button onClick={handleLogin} disabled={busy}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
                  {busy ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Entrar <ArrowRight size={16} /></>}
                </button>
              </>
            )}

            {mode === 'reset' && (
              <>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="E-mail" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <button onClick={handleReset} disabled={busy}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
                  {busy ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Enviar e-mail <ArrowRight size={16} /></>}
                </button>
              </>
            )}

            {mode === 'register' && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados pessoais</p>

                <div>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Nome completo *" value={reg.name}
                      onChange={e => setReg(r => ({ ...r, name: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.name ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name}</p>}
                </div>

                <div>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" placeholder="E-mail *" value={reg.email}
                      onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.email ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} placeholder="Senha (mínimo 6 caracteres) *"
                      value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
                      className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.password ? 'border-red-400' : 'border-gray-200'}`} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password}</p>}
                </div>

                <div>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" placeholder="Telefone / WhatsApp *" value={reg.phone}
                      onChange={e => setReg(r => ({ ...r, phone: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.phone}</p>}
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Endereço</p>

                <div className="relative">
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="CEP *" value={reg.cep}
                      onChange={e => setReg(r => ({ ...r, cep: formatCep(e.target.value) }))}
                      onBlur={handleCepBlur} maxLength={9}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.cep ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {cepLoading && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />}
                  {errors.cep && <p className="text-xs text-red-500 mt-1 ml-1">{errors.cep}</p>}
                </div>

                <div>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Rua / Avenida *" value={reg.street}
                      onChange={e => setReg(r => ({ ...r, street: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.street ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {errors.street && <p className="text-xs text-red-500 mt-1 ml-1">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input placeholder="Número *" value={reg.number}
                      onChange={e => setReg(r => ({ ...r, number: e.target.value }))}
                      className={`w-full px-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.number ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                  </div>
                  <input placeholder="Complemento" value={reg.complement}
                    onChange={e => setReg(r => ({ ...r, complement: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>

                <div>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Bairro *" value={reg.neighborhood}
                      onChange={e => setReg(r => ({ ...r, neighborhood: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.neighborhood ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {errors.neighborhood && <p className="text-xs text-red-500 mt-1 ml-1">{errors.neighborhood}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input placeholder="Cidade *" value={reg.city}
                      onChange={e => setReg(r => ({ ...r, city: e.target.value }))}
                      className={`w-full px-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.city ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <input placeholder="UF" value={reg.state} maxLength={2}
                    onChange={e => setReg(r => ({ ...r, state: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-center" />
                </div>

                <button onClick={handleRegister} disabled={busy}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 mt-1">
                  {busy ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Criar conta <ArrowRight size={16} /></>}
                </button>
              </>
            )}
          </div>
        </div>

        <button onClick={() => router.push('/menu')}
          className="text-white/70 hover:text-white text-sm transition py-1 drop-shadow">
          Voltar ao cardápio →
        </button>
      </div>

      <div className="relative text-center pb-6">
        <button onClick={() => router.push('/admin/login')}
          className="text-xs text-white/40 hover:text-white/70 transition underline underline-offset-2">
          Área administrativa
        </button>
      </div>
    </div>
  )
}
