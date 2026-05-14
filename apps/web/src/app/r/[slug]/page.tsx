'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search, LogIn, LogOut, User, ClipboardList,
  Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft, Phone, MapPin, UtensilsCrossed, ExternalLink,
} from 'lucide-react'
import { getCategories, getProducts, setAppUser } from '@/lib/db'
import { useRestaurant } from '@/lib/restaurant-context'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { lookupCep, formatCep } from '@/lib/delivery'
import type { Category, Product } from '@/types'
import ProductCard from '@/components/customer/ProductCard'
import CartButton from '@/components/customer/CartButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// ---------- Login Gate ----------

type AuthMode = 'login' | 'register' | 'reset'

function LoginGate({ onBrowse }: { onBrowse: () => void }) {
  const { restaurant } = useRestaurant()
  const [mode, setMode] = useState<AuthMode>('login')
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

  const primaryColor = restaurant?.primaryColor || '#f59e0b'

  const go = (m: AuthMode) => {
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
          cep: reg.cep, street: reg.street, number: reg.number,
          complement: reg.complement, neighborhood: reg.neighborhood,
          city: reg.city, state: reg.state,
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
      toast.success('E-mail de recuperação enviado! Verifique o spam.')
      go('login')
    } catch {
      toast.error('E-mail não encontrado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-y-auto">
      {/* Background */}
      {restaurant?.coverImage ? (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${restaurant.coverImage}')` }}
        />
      ) : (
        <div className="fixed inset-0" style={{ backgroundColor: primaryColor }} />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/75" />

      <div className="relative flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-8 gap-5">

        {/* Brand */}
        <div className="text-center">
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt={restaurant.name}
              className="w-28 h-28 rounded-3xl object-cover mx-auto mb-4 shadow-2xl ring-4 ring-white/20" />
          ) : (
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl ring-4 ring-white/20"
              style={{ backgroundColor: primaryColor }}>
              <UtensilsCrossed size={48} className="text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">{restaurant?.name}</h1>
          {restaurant?.phone && (
            <p className="text-white/60 text-sm mt-1">{restaurant.phone}</p>
          )}
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

          <div className="border-b border-gray-100 px-5 py-4" style={{ backgroundColor: `${primaryColor}15` }}>
            {mode === 'reset' ? (
              <div className="flex items-center gap-2">
                <button onClick={() => go('login')} className="hover:opacity-70 transition" style={{ color: primaryColor }}>
                  <ChevronLeft size={22} />
                </button>
                <p className="font-semibold text-gray-700 text-base">Recuperar senha</p>
              </div>
            ) : (
              <div className="flex gap-1 rounded-2xl p-1" style={{ backgroundColor: `${primaryColor}25` }}>
                <button onClick={() => go('login')}
                  className="flex-1 py-2.5 text-base font-semibold rounded-xl transition"
                  style={mode === 'login' ? { backgroundColor: 'white', color: primaryColor } : { color: primaryColor }}>
                  Entrar
                </button>
                <button onClick={() => go('register')}
                  className="flex-1 py-2.5 text-base font-semibold rounded-xl transition"
                  style={mode === 'register' ? { backgroundColor: 'white', color: primaryColor } : { color: primaryColor }}>
                  Criar conta
                </button>
              </div>
            )}
          </div>

          <div className="px-5 py-5 space-y-3">

            {mode === 'login' && (
              <>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="E-mail" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as any} />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} placeholder="Senha" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as any} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="text-right">
                  <button onClick={() => go('reset')} className="text-xs text-gray-400 hover:opacity-70 transition">
                    Esqueci minha senha
                  </button>
                </div>
                <button onClick={handleLogin} disabled={busy}
                  className="w-full text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-base"
                  style={{ backgroundColor: primaryColor }}>
                  {busy
                    ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <>Entrar <ArrowRight size={16} /></>}
                </button>
              </>
            )}

            {mode === 'reset' && (
              <>
                <p className="text-sm text-gray-500">Informe seu e-mail para receber o link de redefinição. Verifique também a pasta de spam.</p>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="E-mail" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as any} />
                </div>
                <button onClick={handleReset} disabled={busy}
                  className="w-full text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-base"
                  style={{ backgroundColor: primaryColor }}>
                  {busy
                    ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <>Enviar e-mail <ArrowRight size={16} /></>}
                </button>
              </>
            )}

            {mode === 'register' && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados pessoais</p>

                {[
                  { icon: User, placeholder: 'Nome completo *', key: 'name', type: 'text' },
                  { icon: Mail, placeholder: 'E-mail *', key: 'email', type: 'email' },
                  { icon: Phone, placeholder: 'Telefone / WhatsApp *', key: 'phone', type: 'tel' },
                ].map(({ icon: Icon, placeholder, key, type }) => (
                  <div key={key}>
                    <div className="relative">
                      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      {key === 'email' ? (
                        <input type={type} placeholder={placeholder} value={(reg as any)[key]}
                          onChange={e => setReg(r => ({ ...r, [key]: e.target.value }))}
                          className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors[key] ? 'border-red-400' : 'border-gray-200'}`}
                          style={{ '--tw-ring-color': primaryColor } as any} />
                      ) : (
                        <input type={type} placeholder={placeholder} value={(reg as any)[key]}
                          onChange={e => setReg(r => ({ ...r, [key]: e.target.value }))}
                          className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors[key] ? 'border-red-400' : 'border-gray-200'}`}
                          style={{ '--tw-ring-color': primaryColor } as any} />
                      )}
                    </div>
                    {errors[key] && <p className="text-xs text-red-500 mt-1 ml-1">{errors[key]}</p>}
                  </div>
                ))}

                <div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} placeholder="Senha (mínimo 6 caracteres) *"
                      value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
                      className={`w-full pl-10 pr-10 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                      style={{ '--tw-ring-color': primaryColor } as any} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password}</p>}
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Endereço para entrega</p>

                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="CEP *" value={reg.cep}
                    onChange={e => setReg(r => ({ ...r, cep: formatCep(e.target.value) }))}
                    onBlur={handleCepBlur} maxLength={9}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.cep ? 'border-red-400' : 'border-gray-200'}`}
                    style={{ '--tw-ring-color': primaryColor } as any} />
                  {cepLoading && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />}
                  {errors.cep && <p className="text-xs text-red-500 mt-1 ml-1">{errors.cep}</p>}
                </div>

                <div>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Rua / Avenida *" value={reg.street}
                      onChange={e => setReg(r => ({ ...r, street: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.street ? 'border-red-400' : 'border-gray-200'}`}
                      style={{ '--tw-ring-color': primaryColor } as any} />
                  </div>
                  {errors.street && <p className="text-xs text-red-500 mt-1 ml-1">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input placeholder="Número *" value={reg.number}
                      onChange={e => setReg(r => ({ ...r, number: e.target.value }))}
                      className={`w-full px-3 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.number ? 'border-red-400' : 'border-gray-200'}`}
                      style={{ '--tw-ring-color': primaryColor } as any} />
                    {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                  </div>
                  <input placeholder="Complemento" value={reg.complement}
                    onChange={e => setReg(r => ({ ...r, complement: e.target.value }))}
                    className="w-full px-3 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as any} />
                </div>

                <div>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Bairro *" value={reg.neighborhood}
                      onChange={e => setReg(r => ({ ...r, neighborhood: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.neighborhood ? 'border-red-400' : 'border-gray-200'}`}
                      style={{ '--tw-ring-color': primaryColor } as any} />
                  </div>
                  {errors.neighborhood && <p className="text-xs text-red-500 mt-1 ml-1">{errors.neighborhood}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input placeholder="Cidade *" value={reg.city}
                      onChange={e => setReg(r => ({ ...r, city: e.target.value }))}
                      className={`w-full px-3 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
                      style={{ '--tw-ring-color': primaryColor } as any} />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <input placeholder="UF" value={reg.state} maxLength={2}
                    onChange={e => setReg(r => ({ ...r, state: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 text-center"
                    style={{ '--tw-ring-color': primaryColor } as any} />
                </div>

                <button onClick={handleRegister} disabled={busy}
                  className="w-full text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-base mt-1"
                  style={{ backgroundColor: primaryColor }}>
                  {busy
                    ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <>Criar conta <ArrowRight size={16} /></>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Browse without login */}
        <button
          onClick={onBrowse}
          className="text-white/80 hover:text-white text-base transition py-3 underline underline-offset-4 drop-shadow"
        >
          Ver cardápio sem fazer login →
        </button>
      </div>
    </div>
  )
}

// ---------- Menu ----------

function MenuContent({ onLogout }: { onLogout: () => void }) {
  const { restaurant, restaurantId, slug } = useRestaurant()
  const { user, appUser, logout } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    async function load() {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(restaurantId),
          getProducts(restaurantId),
        ])
        setCategories(cats.filter(c => c.active))
        setProducts(prods)
        if (cats.length > 0) setActiveCategory(cats[0].id)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [restaurantId])

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !search && activeCategory ? p.categoryId === activeCategory : true
    return matchSearch && matchCategory && p.available
  })

  const grouped = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter(p => p.categoryId === cat.id && p.available)
    if (items.length > 0) acc[cat.id] = items
    return acc
  }, {})

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <LoadingSpinner className="min-h-screen" />

  const primaryColor = restaurant?.primaryColor || '#ef4444'

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {restaurant?.logo && (
                <img src={restaurant.logo} alt={restaurant.name} className="w-10 h-10 rounded-xl object-cover" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{restaurant?.name}</h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition"
              >
                {user ? (
                  <>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}>
                      {(appUser?.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 max-w-20 truncate hidden sm:block">
                      {appUser?.name?.split(' ')[0] || 'Conta'}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">Entrar</span>
                  </>
                )}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-400">Logado como</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{appUser?.name || user.email}</p>
                        </div>
                        <button
                          onClick={() => { setUserMenuOpen(false); router.push(`/r/${slug}/order`) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <ClipboardList size={15} className="text-gray-400" />
                          Meus Pedidos
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); router.push('/profile') }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <User size={15} className="text-gray-400" />
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); onLogout() }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100"
                        >
                          <LogOut size={15} />
                          Sair
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setUserMenuOpen(false); sessionStorage.removeItem('guest-browsing'); window.location.reload() }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <LogIn size={15} className="text-gray-400" />
                        Entrar / Cadastrar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
        </div>

        {!search && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={activeCategory === cat.id
                  ? { backgroundColor: primaryColor, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                }
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {search ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )
        ) : (
          categories.map(cat => {
            const items = grouped[cat.id]
            if (!items || items.length === 0) return null
            return (
              <section key={cat.id} ref={el => { sectionRefs.current[cat.id] = el }}>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                  <span className="text-sm font-normal text-gray-400">({items.length})</span>
                </h2>
                <div className="grid gap-3">
                  {items.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* Footer */}
      {(restaurant?.address || restaurant?.mapsUrl) && (
        <div className="max-w-2xl mx-auto px-4 pb-36 pt-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
              <MapPin size={20} style={{ color: primaryColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Onde estamos</p>
              {restaurant.address && (
                <p className="text-sm text-gray-700 mt-0.5 leading-snug">{restaurant.address}</p>
              )}
            </div>
            {restaurant.mapsUrl && (
              <a
                href={restaurant.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                <MapPin size={13} />
                Maps
              </a>
            )}
          </div>
        </div>
      )}

      <CartButton />
    </div>
  )
}

// ---------- Page ----------

export default function RestaurantMenuPage() {
  const { user, loading, logout } = useAuth()
  const [browsing, setBrowsing] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('guest-browsing') === '1') {
      setBrowsing(true)
    }
  }, [])

  const handleBrowse = () => {
    sessionStorage.setItem('guest-browsing', '1')
    setBrowsing(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('guest-browsing')
    setBrowsing(false)
    logout()
  }

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!user && !browsing) {
    return <LoginGate onBrowse={handleBrowse} />
  }

  return <MenuContent onLogout={handleLogout} />
}
