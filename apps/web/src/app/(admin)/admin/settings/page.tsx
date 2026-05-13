'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Store, Truck, CreditCard, MessageCircle, Share2, Image as ImageIcon, Star, Utensils } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'
import { getRestaurant, updateRestaurant } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Restaurant, DeliveryZone, DailySpecial } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const emptyZone = (): DeliveryZone => ({
  id: crypto.randomUUID(),
  name: '',
  fee: 0,
  cepPrefixes: [],
  neighborhoods: [],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://seuapp.com.br')

export default function SettingsPage() {
  const { appUser } = useAuth()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'operation' | 'daily' | 'delivery' | 'payment' | 'whatsapp' | 'share'>('general')
  const [slugError, setSlugError] = useState('')

  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

  const [form, setForm] = useState({
    name: '', phone: '', address: '', city: '', state: '',
    primaryColor: '#D97706',
    logo: '',
    coverImage: '',
    slug: '',
    estimatedDeliveryTime: 40, estimatedPickupTime: 20,
    deliveryEnabled: true,
    dineInEnabled: true,
    isOpen: true,
    deliveryFee: 0, freeDeliveryAbove: 0, minOrderValue: 0,
    pixKey: '', pixName: '', pixCity: '',
    whatsappNumber: '',
    callmebotApiKey: '',
    deliveryZones: [] as DeliveryZone[],
  })

  const [dailySpecial, setDailySpecial] = useState<DailySpecial>({
    name: '', description: '', price: 0, imageUrl: '', active: false,
  })

  useEffect(() => {
    getRestaurant(restaurantId).then(r => {
      if (r) {
        setRestaurant(r)
        setForm({
          name: r.name || '',
          phone: r.phone || '',
          address: r.address || '',
          city: r.city || '',
          state: r.state || '',
          primaryColor: r.primaryColor || '#D97706',
          logo: r.logo || '',
          coverImage: r.coverImage || '',
          slug: r.slug || '',
          estimatedDeliveryTime: r.estimatedDeliveryTime || 40,
          estimatedPickupTime: r.estimatedPickupTime || 20,
          deliveryEnabled: r.deliveryEnabled ?? true,
          dineInEnabled: r.dineInEnabled ?? true,
          isOpen: r.isOpen ?? true,
          deliveryFee: r.deliveryFee || 0,
          freeDeliveryAbove: r.freeDeliveryAbove || 0,
          minOrderValue: r.minOrderValue || 0,
          pixKey: r.pixKey || '',
          pixName: r.pixName || '',
          pixCity: r.city || '',
          whatsappNumber: r.whatsappNumber || '',
          callmebotApiKey: r.callmebotApiKey || '',
          deliveryZones: r.deliveryZones || [],
        })
        if (r.dailySpecial) setDailySpecial(r.dailySpecial)
      }
      setLoading(false)
    })
  }, [restaurantId])

  const validateSlug = (value: string) => {
    if (!value) return ''
    if (!/^[a-z0-9-]+$/.test(value)) return 'Use apenas letras minúsculas, números e hífens'
    if (value.length < 3) return 'Mínimo 3 caracteres'
    return ''
  }


  const handleSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    setForm(f => ({ ...f, slug: clean }))
    setSlugError(validateSlug(clean))
  }

  const handleSave = async () => {
    const err = validateSlug(form.slug)
    if (err) { setSlugError(err); return }
    setSaving(true)
    try {
      await updateRestaurant(restaurantId, {
        name: form.name, phone: form.phone,
        address: form.address, city: form.city, state: form.state,
        primaryColor: form.primaryColor,
        logo: form.logo || undefined,
        coverImage: form.coverImage || undefined,
        slug: form.slug || undefined,
        estimatedDeliveryTime: Number(form.estimatedDeliveryTime),
        estimatedPickupTime: Number(form.estimatedPickupTime),
        deliveryEnabled: form.deliveryEnabled,
        dineInEnabled: form.dineInEnabled,
        isOpen: form.isOpen,
        deliveryFee: Number(form.deliveryFee),
        freeDeliveryAbove: Number(form.freeDeliveryAbove) || undefined,
        minOrderValue: Number(form.minOrderValue) || undefined,
        pixKey: form.pixKey, pixName: form.pixName,
        whatsappNumber: form.whatsappNumber,
        callmebotApiKey: form.callmebotApiKey || undefined,
        deliveryZones: form.deliveryZones,
        dailySpecial,
      })
      toast.success('Configurações salvas!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const addZone = () => setForm(f => ({ ...f, deliveryZones: [...f.deliveryZones, emptyZone()] }))
  const removeZone = (id: string) => setForm(f => ({ ...f, deliveryZones: f.deliveryZones.filter(z => z.id !== id) }))
  const updateZone = (id: string, field: keyof DeliveryZone, value: any) =>
    setForm(f => ({ ...f, deliveryZones: f.deliveryZones.map(z => z.id === id ? { ...z, [field]: value } : z) }))

  const menuUrl = form.slug ? `${APP_URL}/r/${form.slug}` : ''
  const qrUrl = menuUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&bgcolor=ffffff&color=1f2937&margin=20` : ''

  const tabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'operation', label: 'Operação', icon: Utensils },
    { id: 'daily', label: 'Prato do Dia', icon: Star },
    { id: 'delivery', label: 'Entrega', icon: Truck },
    { id: 'payment', label: 'Pagamento', icon: CreditCard },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'share', label: 'Compartilhar', icon: Share2 },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 text-sm">Configure o Galpão Baiano</p>
        </div>
        {activeTab !== 'share' && (
          <Button onClick={handleSave} loading={saving}>
            <Save size={16} /> Salvar
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${activeTab === tab.id ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon size={15} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <ImageUpload
            label="Foto de capa"
            value={form.coverImage}
            onChange={url => setForm(f => ({ ...f, coverImage: url }))}
            aspectRatio="cover"
            folder="restaurantes/capas"
          />

          <ImageUpload
            label="Logo do restaurante"
            value={form.logo}
            onChange={url => setForm(f => ({ ...f, logo: url }))}
            aspectRatio="square"
            folder="restaurantes/logos"
          />

          <Input label="Nome do Restaurante" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Telefone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Endereço" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Cidade" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <Input label="UF" value={form.state} maxLength={2} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cor principal</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="w-12 h-10 rounded-xl border border-gray-200 cursor-pointer" />
              <Input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1" />
            </div>
          </div>

          <div>
            <Input label="Link do cardápio (slug)" placeholder="galpao-baiano"
              value={form.slug} onChange={e => handleSlugChange(e.target.value)} error={slugError} />
            {form.slug && !slugError && (
              <p className="text-xs text-green-600 mt-1">✅ URL: <span className="font-mono">{APP_URL}/r/{form.slug}</span></p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Tempo entrega (min)" type="number" value={form.estimatedDeliveryTime.toString()}
              onChange={e => setForm(f => ({ ...f, estimatedDeliveryTime: parseInt(e.target.value) || 40 }))} />
            <Input label="Tempo retirada (min)" type="number" value={form.estimatedPickupTime.toString()}
              onChange={e => setForm(f => ({ ...f, estimatedPickupTime: parseInt(e.target.value) || 20 }))} />
          </div>
        </div>
      )}

      {/* Operation */}
      {activeTab === 'operation' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-800 mb-1">Controle Operacional</h3>

          {/* Open/Close */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${form.isOpen ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <div>
              <p className="font-bold text-gray-800">{form.isOpen ? '🟢 Restaurante Aberto' : '🔴 Restaurante Fechado'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Clientes podem {form.isOpen ? '' : 'não '}fazer pedidos agora</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
              className={`relative w-14 h-7 rounded-full transition-colors ${form.isOpen ? 'bg-green-500' : 'bg-red-400'}`}
            >
              <div className={`absolute top-1.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isOpen ? 'left-8' : 'left-1.5'}`} />
            </button>
          </div>

          {/* Delivery */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
            <div>
              <p className="font-semibold text-gray-800">🛵 Delivery ativado</p>
              <p className="text-xs text-gray-400">Permite pedidos com entrega em domicílio</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, deliveryEnabled: !f.deliveryEnabled }))}
              className={`relative w-11 h-6 rounded-full transition ${form.deliveryEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.deliveryEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Dine In */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
            <div>
              <p className="font-semibold text-gray-800">🍽️ Consumir no local</p>
              <p className="text-xs text-gray-400">Permite pedidos para mesa/balcão</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, dineInEnabled: !f.dineInEnabled }))}
              className={`relative w-11 h-6 rounded-full transition ${form.dineInEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.dineInEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Prato do Dia */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Star size={18} className="text-amber-500" />
                Prato do Dia
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Destaque no topo do cardápio</p>
            </div>
            <button onClick={() => setDailySpecial(d => ({ ...d, active: !d.active }))}
              className={`relative w-11 h-6 rounded-full transition ${dailySpecial.active ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${dailySpecial.active ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <ImageUpload
            label="Foto do prato"
            value={dailySpecial.imageUrl}
            onChange={url => setDailySpecial(d => ({ ...d, imageUrl: url }))}
            aspectRatio="cover"
            folder="restaurantes/pratos"
          />

          <Input label="Nome do prato" placeholder="Ex: Moqueca de Camarão"
            value={dailySpecial.name}
            onChange={e => setDailySpecial(d => ({ ...d, name: e.target.value }))} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
            <textarea
              placeholder="Ex: Moqueca baiana com leite de coco, dendê, tomate e coentro. Acompanha arroz e farofa."
              value={dailySpecial.description}
              onChange={e => setDailySpecial(d => ({ ...d, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <Input label="Preço (R$)" type="number" step="0.01" placeholder="0,00"
            value={dailySpecial.price.toString()}
            onChange={e => setDailySpecial(d => ({ ...d, price: parseFloat(e.target.value) || 0 }))} />

          {/* Preview */}
          {dailySpecial.active && dailySpecial.name && (
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-100 mb-2">⭐ Preview no cardápio</p>
              <div className="flex gap-3">
                {dailySpecial.imageUrl && (
                  <img src={dailySpecial.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/30" />
                )}
                <div>
                  <p className="font-bold">{dailySpecial.name}</p>
                  <p className="text-amber-100 text-xs mt-0.5 line-clamp-2">{dailySpecial.description}</p>
                  {dailySpecial.price > 0 && (
                    <p className="font-bold text-lg mt-1">R$ {dailySpecial.price.toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery config */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Taxa de entrega padrão (R$)" type="number" step="0.01"
                value={form.deliveryFee.toString()} onChange={e => setForm(f => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))} />
              <Input label="Frete grátis acima de (R$)" type="number" step="0.01" placeholder="0 = desativado"
                value={form.freeDeliveryAbove.toString()} onChange={e => setForm(f => ({ ...f, freeDeliveryAbove: parseFloat(e.target.value) || 0 }))} />
            </div>
            <Input label="Pedido mínimo (R$)" type="number" step="0.01" placeholder="0 = sem mínimo"
              value={form.minOrderValue.toString()} onChange={e => setForm(f => ({ ...f, minOrderValue: parseFloat(e.target.value) || 0 }))} />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Zonas de entrega</h3>
                <p className="text-xs text-gray-400">Configure taxas diferenciadas por região</p>
              </div>
              <Button size="sm" onClick={addZone}><Plus size={14} /> Adicionar</Button>
            </div>
            {form.deliveryZones.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma zona. Será usada a taxa padrão.</p>
            )}
            {form.deliveryZones.map(zone => (
              <div key={zone.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Zona de entrega</span>
                  <button onClick={() => removeZone(zone.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nome da zona" placeholder="Ex: Centro"
                    value={zone.name} onChange={e => updateZone(zone.id, 'name', e.target.value)} />
                  <Input label="Taxa (R$)" type="number" step="0.01"
                    value={zone.fee.toString()} onChange={e => updateZone(zone.id, 'fee', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Prefixos de CEP (um por linha)</label>
                  <textarea placeholder={'40000\n41000'} value={zone.cepPrefixes.join('\n')}
                    onChange={e => updateZone(zone.id, 'cepPrefixes', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                    rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Bairros (um por linha, opcional)</label>
                  <textarea placeholder={'Pelourinho\nBarra'} value={zone.neighborhoods.join('\n')}
                    onChange={e => updateZone(zone.id, 'neighborhoods', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                    rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment */}
      {activeTab === 'payment' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-800">Configuração PIX</h3>
          <Input label="Chave PIX" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} />
          <Input label="Nome no PIX" placeholder="Galpão Baiano"
            value={form.pixName} onChange={e => setForm(f => ({ ...f, pixName: e.target.value }))} />
          <Input label="Cidade (para QR Code PIX)" placeholder="SALVADOR"
            value={form.pixCity || form.city} onChange={e => setForm(f => ({ ...f, pixCity: e.target.value }))} />
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 A chave PIX é usada para gerar o QR Code automaticamente quando o cliente escolhe pagar com PIX.
          </div>
        </div>
      )}

      {/* WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-4">

          {/* Número */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-semibold text-gray-800">Número do restaurante</h3>
            <Input
              label="WhatsApp do restaurante (com DDI e DDD, só números)"
              placeholder="5571999999999"
              value={form.whatsappNumber}
              onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value.replace(/\D/g, '') }))}
            />
            <p className="text-xs text-gray-400">Ex: 55 71 99999-9999 → <span className="font-mono">5571999999999</span></p>
            {form.whatsappNumber && (
              <a
                href={`https://wa.me/${form.whatsappNumber}?text=Teste+de+mensagem`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-2.5 rounded-xl text-sm transition hover:bg-[#20b858]"
              >
                📲 Testar número no WhatsApp
              </a>
            )}
          </div>

          {/* Passo a passo CallMeBot */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Notificação automática (CallMeBot — grátis)</h3>
              {form.callmebotApiKey && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✓ Ativo</span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Salvar contato no celular</p>
                  <p className="text-xs text-gray-500 mt-0.5">No WhatsApp que vai receber os pedidos, salve o número abaixo como contato:</p>
                  <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 font-mono text-sm font-bold text-gray-800 flex items-center justify-between">
                    +34 644 60 49 16
                    <button
                      onClick={() => { navigator.clipboard.writeText('+34 644 60 49 16'); toast.success('Número copiado!') }}
                      className="text-xs text-amber-600 font-sans font-semibold"
                    >Copiar</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Enviar mensagem de ativação</p>
                  <p className="text-xs text-gray-500 mt-0.5">Mande essa mensagem exata para o contato CallMeBot no WhatsApp:</p>
                  <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 flex items-center justify-between gap-2">
                    <span>I allow callmebot to send me messages</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText('I allow callmebot to send me messages'); toast.success('Mensagem copiada!') }}
                      className="text-xs text-amber-600 font-sans font-semibold flex-shrink-0"
                    >Copiar</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Em segundos você recebe a sua <strong>API Key</strong> de resposta.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Cole a API Key abaixo e salve</p>
                  <p className="text-xs text-gray-500 mt-0.5">A key tem 6 dígitos e vem na resposta do CallMeBot.</p>
                  <div className="mt-2">
                    <Input
                      label=""
                      placeholder="Ex: 123456"
                      value={form.callmebotApiKey}
                      onChange={e => setForm(f => ({ ...f, callmebotApiKey: e.target.value.trim() }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {form.callmebotApiKey && form.whatsappNumber && (
              <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 font-medium">
                ✅ Tudo configurado! Cada novo pedido enviará uma mensagem automática para {form.whatsappNumber}.
              </div>
            )}
            {form.callmebotApiKey && !form.whatsappNumber && (
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                ⚠️ Informe o número do WhatsApp do restaurante acima.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share */}
      {activeTab === 'share' && (
        <div className="space-y-4">
          {!form.slug ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <Share2 size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">Configure o link do cardápio primeiro</p>
              <p className="text-sm text-gray-400 mt-1">Vá na aba "Geral" e defina o slug do restaurante</p>
              <button onClick={() => setActiveTab('general')} className="mt-4 text-amber-500 text-sm font-semibold hover:underline">
                Ir para Geral →
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-800">Link do cardápio</h3>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <span className="text-sm text-gray-700 font-mono flex-1 break-all">{menuUrl}</span>
                  <button onClick={() => { navigator.clipboard.writeText(menuUrl); toast.success('Link copiado!') }}
                    className="text-xs text-amber-600 font-semibold flex-shrink-0 hover:text-amber-700">Copiar</button>
                </div>
                <div className="flex gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Acesse nosso cardápio: ${menuUrl}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                    📱 Compartilhar no WhatsApp
                  </a>
                  <a href={menuUrl} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold py-2.5 px-4 rounded-xl transition text-gray-600">
                    Abrir
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Share2 size={18} className="text-amber-500" />
                  QR Code para impressão
                </h3>
                <div className="flex justify-center">
                  <img src={qrUrl} alt="QR Code do cardápio" className="w-48 h-48 rounded-xl border border-gray-100" />
                </div>
                <a href={qrUrl} download={`qrcode-${form.slug}.png`}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition text-sm">
                  ⬇️ Baixar QR Code (PNG)
                </a>
                <p className="text-xs text-gray-400 text-center">
                  Imprima e cole nas mesas, cardápio físico ou vitrine do restaurante
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab !== 'share' && (
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving} size="lg">
            <Save size={16} /> Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  )
}
