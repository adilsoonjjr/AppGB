'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, MapPin, Phone, Mail, Trash2, Save, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { setAppUser } from '@/lib/db'
import type { Address } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { lookupCep } from '@/lib/delivery'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, appUser, refreshAppUser, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  })

  const [addresses, setAddresses] = useState<Address[]>([])
  const [newAddress, setNewAddress] = useState<Partial<Address>>({})
  const [cepLoading, setCepLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/menu')
      return
    }
    if (appUser) {
      setForm({
        name: appUser.name || '',
        phone: appUser.phone || '',
        email: appUser.email || user?.email || '',
      })
      setAddresses(appUser.savedAddresses || [])
    }
  }, [appUser, user, loading, router])

  const handleCepBlur = async () => {
    const cep = newAddress.cep?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) return
    setCepLoading(true)
    const result = await lookupCep(cep)
    if (result) {
      setNewAddress(a => ({
        ...a,
        street: result.logradouro || a.street,
        neighborhood: result.bairro || a.neighborhood,
        city: result.localidade || a.city,
        state: result.uf || a.state,
      }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const addAddress = () => {
    if (!newAddress.cep || !newAddress.street) {
      toast.error('CEP e rua são obrigatórios')
      return
    }
    const addr: Address = {
      cep: newAddress.cep!,
      street: newAddress.street!,
      number: newAddress.number || '',
      complement: newAddress.complement || '',
      neighborhood: newAddress.neighborhood || '',
      city: newAddress.city || '',
      state: newAddress.state || '',
    }
    setAddresses(prev => [addr, ...prev].slice(0, 5))
    setNewAddress({})
    toast.success('Endereço adicionado')
  }

  const removeAddress = (index: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setAppUser(user.uid, {
        uid: user.uid,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: appUser?.role || 'customer',
        restaurantId: appUser?.restaurantId,
        savedAddresses: addresses,
        createdAt: appUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await refreshAppUser()
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 text-sm">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={18} className="text-amber-500" />
          <h2 className="font-bold text-gray-900">Informações Pessoais</h2>
        </div>

        <Input
          label="Nome completo"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Seu nome"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Telefone / WhatsApp"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">E-mail</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <Mail size={15} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500 truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saved addresses */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={18} className="text-amber-500" />
          <h2 className="font-bold text-gray-900">Endereços Salvos</h2>
          <span className="text-xs text-gray-400 ml-auto">máx. 5</span>
        </div>

        {addresses.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Nenhum endereço salvo ainda</p>
        )}

        {addresses.map((addr, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl">
            <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}
              </p>
              <p className="text-xs text-gray-500">{addr.neighborhood} · {addr.city}/{addr.state} · CEP {addr.cep}</p>
            </div>
            <button onClick={() => removeAddress(i)} className="text-red-400 hover:text-red-600 p-1">
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {/* Add address form */}
        {addresses.length < 5 && (
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Adicionar endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  value={newAddress.cep || ''}
                  onChange={e => setNewAddress(a => ({ ...a, cep: e.target.value }))}
                  onBlur={handleCepBlur}
                />
              </div>
              <Input
                label="Número"
                placeholder="123"
                value={newAddress.number || ''}
                onChange={e => setNewAddress(a => ({ ...a, number: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rua"
                placeholder={cepLoading ? 'Buscando...' : 'Rua, Av...'}
                value={newAddress.street || ''}
                onChange={e => setNewAddress(a => ({ ...a, street: e.target.value }))}
              />
              <Input
                label="Complemento"
                placeholder="Apto, Bloco..."
                value={newAddress.complement || ''}
                onChange={e => setNewAddress(a => ({ ...a, complement: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Bairro"
                  value={newAddress.neighborhood || ''}
                  onChange={e => setNewAddress(a => ({ ...a, neighborhood: e.target.value }))}
                />
              </div>
              <Input
                label="UF"
                maxLength={2}
                value={newAddress.state || ''}
                onChange={e => setNewAddress(a => ({ ...a, state: e.target.value.toUpperCase() }))}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={addAddress}>
              <MapPin size={14} /> Adicionar
            </Button>
          </div>
        )}
      </div>

      <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
        <Save size={16} /> Salvar Perfil
      </Button>
    </div>
  )
}
