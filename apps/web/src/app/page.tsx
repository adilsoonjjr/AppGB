'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getAppUser, setAppUser } from '@/lib/db'
import { lookupCep, formatCep } from '@/lib/delivery'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, ChevronLeft, Phone, MapPin } from 'lucide-react'

type Mode = 'login' | 'register' | 'reset' | 'profile'

export default function EntryPage() {
  const { user, appUser, loading, refreshAppUser } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  const [profile, setProfile] = useState({
    phone: '',
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (loading || !user || !appUser) return
    if (appUser.role === 'admin' || appUser.role === 'superadmin' || appUser.role === 'employee') {
      router.replace('/admin/dashboard')
    } else {
      router.replace('/menu')
    }
  }, [user, appUser, loading, router])

  if (loading || (user && mode !== 'profile')) return <LoadingSpinner />

  const reset = () => { setEmail(''); setPassword(''); setName('') }
  const go = (m: Mode) => { setMode(m); reset() }

  const handleGoogle = async () => {
    setBusy(true)
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider())
      const existing = await getAppUser(cred.user.uid)
      if (!existing) {
        await setAppUser(cred.user.uid, {
          uid: cred.user.uid,
          name: cred.user.displayName || '',
          email: cred.user.email || '',
          role: 'customer',
          savedAddresses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') toast.error('Erro ao entrar com Google')
    } finally {
      setBusy(false)
    }
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

  const handleRegister = async () => {
    if (!name.trim()) return toast.error('Informe seu nome')
    if (!email || !password) return toast.error('Preencha e-mail e senha')
    if (password.length < 6) return toast.error('Senha deve ter pelo menos 6 caracteres')
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setAppUser(cred.user.uid, {
        uid: cred.user.uid, name: name.trim(), email,
        role: 'customer', savedAddresses: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      })
      setMode('profile')
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

  const handleCepBlur = async () => {
    const clean = profile.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    const data = await lookupCep(clean)
    if (data) {
      setProfile(p => ({
        ...p,
        street: data.logradouro || p.street,
        neighborhood: data.bairro || p.neighborhood,
        city: data.localidade || p.city,
        state: data.uf || p.state,
      }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const validateProfile = () => {
    const e: Record<string, string> = {}
    if (!profile.phone.trim() || profile.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (!profile.cep.trim() || profile.cep.replace(/\D/g, '').length < 8) e.cep = 'CEP inválido'
    if (!profile.street.trim()) e.street = 'Rua obrigatória'
    if (!profile.number.trim()) e.number = 'Número obrigatório'
    if (!profile.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório'
    if (!profile.city.trim()) e.city = 'Cidade obrigatória'
    setProfileErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfile() || !user) return
    setBusy(true)
    try {
      await setAppUser(user.uid, {
        phone: profile.phone,
        savedAddresses: [{
          cep: profile.cep,
          street: profile.street,
          number: profile.number,
          complement: profile.complement,
          neighborhood: profile.neighborhood,
          city: profile.city,
          state: profile.state,
        }],
        updatedAt: new Date().toISOString(),
      })
      await refreshAppUser()
      toast.success('Perfil completo! Bem-vindo!')
      router.replace('/menu')
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setBusy(false)
    }
  }

  const submit = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset
  const submitLabel = mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar e-mail'

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/galpao-bg.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 gap-8">

        {/* Brand */}
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/20">
            <span className="text-4xl">🍲</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Galpão Baiano</h1>
          <p className="text-amber-200 text-sm mt-2 drop-shadow">Sabor baiano de verdade</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
            {mode === 'profile' ? (
              <div>
                <p className="font-bold text-amber-800">Complete seu cadastro</p>
                <p className="text-xs text-amber-600 mt-0.5">Telefone e endereço para suas entregas</p>
              </div>
            ) : mode !== 'reset' ? (
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
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => go('login')} className="text-amber-600 hover:text-amber-700 transition">
                  <ChevronLeft size={20} />
                </button>
                <p className="font-semibold text-amber-700">Recuperar senha</p>
              </div>
            )}
          </div>

          {/* Body */}
          {mode === 'profile' ? (
            /* === PASSO 2: TELEFONE + ENDEREÇO === */
            <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <Input
                label="Telefone / WhatsApp *"
                placeholder="(71) 99999-9999"
                type="tel"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                error={profileErrors.phone}
                icon={<Phone size={15} />}
              />

              <div className="pt-1 pb-0.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin size={12} /> Endereço principal
                </p>
              </div>

              <div className="relative">
                <Input
                  label="CEP *"
                  placeholder="00000-000"
                  value={profile.cep}
                  onChange={e => setProfile(p => ({ ...p, cep: formatCep(e.target.value) }))}
                  onBlur={handleCepBlur}
                  error={profileErrors.cep}
                  icon={<MapPin size={15} />}
                  maxLength={9}
                />
                {cepLoading && (
                  <div className="absolute right-3 top-8 w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
                )}
              </div>

              <Input
                label="Rua / Avenida *"
                placeholder="Rua das Flores"
                value={profile.street}
                onChange={e => setProfile(p => ({ ...p, street: e.target.value }))}
                error={profileErrors.street}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Número *"
                  placeholder="123"
                  value={profile.number}
                  onChange={e => setProfile(p => ({ ...p, number: e.target.value }))}
                  error={profileErrors.number}
                />
                <Input
                  label="Complemento"
                  placeholder="Apto, Bloco..."
                  value={profile.complement}
                  onChange={e => setProfile(p => ({ ...p, complement: e.target.value }))}
                />
              </div>

              <Input
                label="Bairro *"
                placeholder="Centro"
                value={profile.neighborhood}
                onChange={e => setProfile(p => ({ ...p, neighborhood: e.target.value }))}
                error={profileErrors.neighborhood}
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Cidade *"
                    placeholder="Salvador"
                    value={profile.city}
                    onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                    error={profileErrors.city}
                  />
                </div>
                <Input
                  label="UF"
                  placeholder="BA"
                  value={profile.state}
                  maxLength={2}
                  onChange={e => setProfile(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={busy}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 mt-1"
              >
                {busy
                  ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>Concluir Cadastro <ArrowRight size={16} /></>
                }
              </button>

              <button
                onClick={() => router.replace('/menu')}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition pt-1"
              >
                Pular por agora →
              </button>
            </div>
          ) : (
            /* === PASSO 1: LOGIN / REGISTRO / RESET === */
            <div className="px-6 py-5 space-y-3">
              {mode !== 'reset' && (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continuar com Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">ou</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                </>
              )}

              {mode === 'register' && (
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Seu nome completo" value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" placeholder="E-mail" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {mode !== 'reset' && (
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="Senha" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button onClick={() => go('reset')}
                    className="text-xs text-gray-400 hover:text-amber-600 transition">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                onClick={submit}
                disabled={busy}
                className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                {busy
                  ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>{submitLabel} <ArrowRight size={16} /></>
                }
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/menu')}
          className="text-white/70 hover:text-white text-sm transition py-1 drop-shadow"
        >
          Ver cardápio sem entrar →
        </button>
      </div>

      <div className="relative text-center pb-6">
        <button
          onClick={() => router.push('/admin/login')}
          className="text-xs text-white/40 hover:text-white/70 transition underline underline-offset-2"
        >
          Área administrativa
        </button>
      </div>
    </div>
  )
}
