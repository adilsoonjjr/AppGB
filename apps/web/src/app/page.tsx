'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { setAppUser } from '@/lib/db'
import { lookupCep, formatCep } from '@/lib/delivery'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { User, Phone, MapPin, ArrowRight } from 'lucide-react'

type Step = 'login' | 'profile'

export default function EntryPage() {
  const { user, appUser, loading, refreshAppUser, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [busy, setBusy] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '',
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (loading || !user || !appUser) return
    if (appUser.role === 'admin' || appUser.role === 'superadmin' || appUser.role === 'employee') {
      router.replace('/admin/dashboard')
      return
    }
    if (!appUser.phone) {
      setForm(f => ({ ...f, name: appUser.name || user.displayName || '' }))
      setStep('profile')
    } else {
      router.replace('/menu')
    }
  }, [user, appUser, loading, router])

  if (loading) return <LoadingSpinner />
  if (user && step === 'login') return <LoadingSpinner />

  const handleGoogle = async () => {
    setBusy(true)
    try {
      await signInWithGoogle()
      // Redireciona para o Google — ao voltar, auth-context captura o resultado
    } catch {
      toast.error('Erro ao entrar com Google')
      setBusy(false)
    }
  }

  const handleCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    const data = await lookupCep(clean)
    if (data) {
      setForm(f => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (!form.cep.trim() || form.cep.replace(/\D/g, '').length < 8) e.cep = 'CEP inválido'
    if (!form.street.trim()) e.street = 'Rua obrigatória'
    if (!form.number.trim()) e.number = 'Número obrigatório'
    if (!form.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório'
    if (!form.city.trim()) e.city = 'Cidade obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validate() || !user) return
    setSaving(true)
    try {
      await setAppUser(user.uid, {
        name: form.name,
        phone: form.phone,
        savedAddresses: [{
          cep: form.cep,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        }],
        updatedAt: new Date().toISOString(),
      })
      await refreshAppUser()
      toast.success('Cadastro completo! Bem-vindo!')
      router.replace('/menu')
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/galpao-bg.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 gap-6">

        {/* Brand */}
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/20">
            <span className="text-4xl">🍲</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Galpão Baiano</h1>
          <p className="text-amber-200 text-sm mt-2 drop-shadow">Sabor baiano de verdade</p>
        </div>

        {step === 'login' ? (
          /* === TELA DE LOGIN === */
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-6 space-y-4">
              <p className="text-center text-sm text-gray-500">
                Entre para salvar seus pedidos e endereços
              </p>

              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continuar com Google
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* === TELA DE CADASTRO === */
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
              <h2 className="font-bold text-amber-800">Complete seu cadastro</h2>
              <p className="text-xs text-amber-600 mt-0.5">Necessário para realizar pedidos e delivery</p>
            </div>

            <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">

              {/* Dados pessoais */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <User size={12} /> Dados pessoais
              </p>

              <Input
                label="Nome completo *"
                placeholder="João Silva"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                error={errors.name}
                icon={<User size={15} />}
              />
              <Input
                label="Telefone / WhatsApp *"
                placeholder="(71) 99999-9999"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                error={errors.phone}
                icon={<Phone size={15} />}
              />

              {/* Endereço */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 pt-1">
                <MapPin size={12} /> Endereço principal
              </p>

              <div className="relative">
                <Input
                  label="CEP *"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={e => setForm(f => ({ ...f, cep: formatCep(e.target.value) }))}
                  onBlur={handleCepBlur}
                  error={errors.cep}
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
                value={form.street}
                onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                error={errors.street}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Número *"
                  placeholder="123"
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  error={errors.number}
                />
                <Input
                  label="Complemento"
                  placeholder="Apto, Bloco..."
                  value={form.complement}
                  onChange={e => setForm(f => ({ ...f, complement: e.target.value }))}
                />
              </div>

              <Input
                label="Bairro *"
                placeholder="Centro"
                value={form.neighborhood}
                onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                error={errors.neighborhood}
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Cidade *"
                    placeholder="Salvador"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    error={errors.city}
                  />
                </div>
                <Input
                  label="UF"
                  placeholder="BA"
                  value={form.state}
                  maxLength={2}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 mt-2"
              >
                {saving
                  ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>Concluir Cadastro <ArrowRight size={16} /></>
                }
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/menu')}
          className="text-white/70 hover:text-white text-sm transition py-1 drop-shadow"
        >
          Ver cardápio sem entrar →
        </button>
      </div>

      {/* Admin link */}
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
