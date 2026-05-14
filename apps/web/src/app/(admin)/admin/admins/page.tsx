'use client'

import { useEffect, useState } from 'react'
import { Plus, Store, UserCheck, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { getAllRestaurants, getAdminsByRestaurant, createRestaurant, setAppUser, updateRestaurant } from '@/lib/db'
import type { Restaurant, AppUser, SubscriptionPlan } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminsPage() {
  const { appUser } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [admins, setAdmins] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<'restaurant' | 'admin' | null>(null)
  const [saving, setSaving] = useState(false)

  const [restaurantForm, setRestaurantForm] = useState({
    name: '', phone: '', city: '', state: '',
    primaryColor: '#d97706',
    deliveryEnabled: true, deliveryFee: 5, estimatedDeliveryTime: 40, estimatedPickupTime: 20,
    deliveryZones: [], active: true,
  })

  const [adminForm, setAdminForm] = useState({
    name: '', email: '', password: '', restaurantId: '', role: 'admin' as 'admin' | 'superadmin',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isSuperAdmin = appUser?.role === 'superadmin'

  const load = async () => {
    setLoading(true)
    const [rests] = await Promise.all([getAllRestaurants()])
    setRestaurants(rests)
    if (rests.length > 0) {
      const adminList = await Promise.all(rests.map(r => getAdminsByRestaurant(r.id)))
      setAdmins(adminList.flat())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreateRestaurant = async () => {
    if (!restaurantForm.name.trim()) return toast.error('Nome obrigatório')
    setSaving(true)
    try {
      const now = new Date().toISOString()
      await createRestaurant({
        ...restaurantForm,
        pixKey: '', pixName: restaurantForm.name, whatsappNumber: '',
        address: '', logo: '',
        createdAt: now, updatedAt: now,
      } as any)
      toast.success('Restaurante criado!')
      await load()
      setModalType(null)
    } catch {
      toast.error('Erro ao criar restaurante')
    } finally {
      setSaving(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const handleCreateAdmin = async () => {
    if (!adminForm.name.trim()) return toast.error('Nome obrigatório')
    if (!adminForm.email.trim()) return toast.error('E-mail obrigatório')
    if (!adminForm.password.trim()) return toast.error('Senha obrigatória')
    if (!adminForm.restaurantId) return toast.error('Selecione o restaurante')
    setSaving(true)
    try {
      const idToken = await auth.currentUser?.getIdToken(true)
      if (!idToken) return toast.error('Sessão expirada. Faça login novamente.')
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: adminForm.name,
          email: adminForm.email,
          password: adminForm.password,
          restaurantId: adminForm.restaurantId,
          role: adminForm.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Erro ao criar admin')
      setCreatedCredentials({ email: adminForm.email, password: adminForm.password })
      toast.success('Admin criado com sucesso!')
      await load()
    } catch {
      toast.error('Erro ao criar admin')
    } finally {
      setSaving(false)
    }
  }

  const copyCredentials = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(
      `Acesso ao sistema:\nE-mail: ${createdCredentials.email}\nSenha provisória: ${createdCredentials.password}\n\nAcesse: ${window.location.origin}/admin/login\n\nTroque sua senha em: Configurações → Segurança`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSetPlan = async (restaurantId: string, plan: SubscriptionPlan) => {
    try {
      const updates: any = { plan }
      if (plan === 'active') {
        updates.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
      await updateRestaurant(restaurantId, updates)
      toast.success('Plano atualizado!')
      await load()
    } catch {
      toast.error('Erro ao atualizar plano')
    }
  }

  if (loading) return <LoadingSpinner />

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestão de Admins</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800">
          <p className="font-semibold">Acesso restrito</p>
          <p className="text-sm mt-1">Apenas o superadmin pode gerenciar outros administradores e restaurantes.</p>
        </div>

        {/* Admin vê apenas o próprio restaurante */}
        <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-1">Seu Restaurante</h2>
          <p className="text-sm text-gray-500">{appUser?.restaurantId}</p>
          <p className="text-xs text-gray-400 mt-3">
            Para adicionar outros administradores ao seu restaurante, entre em contato com o suporte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurantes & Admins</h1>
          <p className="text-gray-500 text-sm">Gerencie todos os clientes do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={15} /></Button>
          <Button size="sm" onClick={() => setModalType('restaurant')}><Plus size={15} /> Restaurante</Button>
          <Button variant="outline" size="sm" onClick={() => setModalType('admin')}><UserCheck size={15} /> Admin</Button>
        </div>
      </div>

      {/* Restaurants */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Store size={18} className="text-amber-500" />
          <h2 className="font-bold text-gray-900">Restaurantes ({restaurants.length})</h2>
        </div>
        {restaurants.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">Nenhum restaurante cadastrado</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {restaurants.map(r => {
              const restaurantAdmins = admins.filter(a => a.restaurantId === r.id)
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.primaryColor }} />
                        <span className="font-semibold text-gray-900">{r.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.active ? 'Ativo' : 'Inativo'}
                        </span>
                        {r.plan === 'trial' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Trial {r.trialEndsAt ? `até ${new Date(r.trialEndsAt).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                        )}
                        {r.plan === 'active' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Pago</span>
                        )}
                        {(r.plan === 'expired' || r.plan === 'cancelled') && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expirado</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">ID: {r.id} · {r.city}, {r.state}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">{restaurantAdmins.length} admin(s)</p>
                      <select
                        value={r.plan || 'trial'}
                        onChange={e => handleSetPlan(r.id, e.target.value as SubscriptionPlan)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                      >
                        <option value="trial">Trial</option>
                        <option value="active">Pago</option>
                        <option value="expired">Expirado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  {restaurantAdmins.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {restaurantAdmins.map(a => (
                        <span key={a.uid} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {a.name || a.email} · {a.role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Restaurant Modal */}
      <Modal open={modalType === 'restaurant'} onClose={() => setModalType(null)} title="Novo Restaurante" size="lg">
        <div className="space-y-4">
          <Input label="Nome do restaurante" value={restaurantForm.name}
            onChange={e => setRestaurantForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Telefone" value={restaurantForm.phone}
            onChange={e => setRestaurantForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Cidade" value={restaurantForm.city}
                onChange={e => setRestaurantForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <Input label="UF" value={restaurantForm.state} maxLength={2}
              onChange={e => setRestaurantForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Taxa de entrega (R$)" type="number" value={restaurantForm.deliveryFee.toString()}
              onChange={e => setRestaurantForm(f => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cor principal</label>
              <input type="color" value={restaurantForm.primaryColor}
                onChange={e => setRestaurantForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 Após criar o restaurante, adicione o admin via "Configurar Admin" e configure o <code>NEXT_PUBLIC_RESTAURANT_ID</code> no .env.local do restaurante.
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalType(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleCreateRestaurant} loading={saving}>Criar Restaurante</Button>
          </div>
        </div>
      </Modal>

      {/* Create Admin Modal */}
      <Modal open={modalType === 'admin'} onClose={() => { setModalType(null); setCreatedCredentials(null); setAdminForm({ name: '', email: '', password: '', restaurantId: '', role: 'admin' }) }} title="Novo Administrador">
        {createdCredentials ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserCheck size={22} className="text-green-600" />
              </div>
              <p className="font-bold text-green-800">Admin criado com sucesso!</p>
              <p className="text-sm text-green-600 mt-1">Envie as credenciais abaixo para o dono</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Credenciais de acesso</span>
                <button onClick={copyCredentials} className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                  {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar tudo</>}
                </button>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-500">E-mail</span>
                  <span className="text-sm font-mono font-medium text-gray-900">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-500">Senha provisória</span>
                  <span className="text-sm font-mono font-bold text-gray-900">{createdCredentials.password}</span>
                </div>
                <div className="flex justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-500">URL de acesso</span>
                  <span className="text-sm font-mono text-blue-600">/admin/login</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">⚠️ O dono deve trocar a senha em: <strong>Configurações → Segurança</strong></p>
            </div>

            <Button className="w-full" onClick={() => { setModalType(null); setCreatedCredentials(null) }}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Nome completo" placeholder="João Silva"
              value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))} />

            <Input label="E-mail de acesso" type="email" placeholder="joao@restaurante.com"
              value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Senha provisória</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={adminForm.password}
                    onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setAdminForm(f => ({ ...f, password: generatePassword() }))}>
                  Gerar
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Restaurante</label>
              <select value={adminForm.restaurantId} onChange={e => setAdminForm(f => ({ ...f, restaurantId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="">Selecione o restaurante...</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Função</label>
              <select value={adminForm.role} onChange={e => setAdminForm(f => ({ ...f, role: e.target.value as any }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="admin">Admin — gerencia apenas este restaurante</option>
                <option value="superadmin">Superadmin — acesso total ao sistema</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setModalType(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreateAdmin} loading={saving}>Criar Admin</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
