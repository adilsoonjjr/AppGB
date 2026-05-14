'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Store, CreditCard, Smartphone, DollarSign, User, Phone, ChevronRight } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useRestaurant } from '@/lib/restaurant-context'
import { formatCurrency } from '@/lib/utils'
import { createOrder, setAppUser, getNextOrderNumber, getCouponByCode, incrementCouponUsage } from '@/lib/db'
import type { Coupon } from '@/types'
import { lookupCep, calculateDeliveryFee, formatCep } from '@/lib/delivery'
import type { OrderType, PaymentMethod, Address } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthModal from '@/components/customer/AuthModal'
import toast from 'react-hot-toast'

export default function SlugCheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { user, appUser, refreshAppUser } = useAuth()
  const { restaurant, restaurantId, slug } = useRestaurant()
  const router = useRouter()

  const [orderType, setOrderType] = useState<OrderType>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [needsChange, setNeedsChange] = useState(false)
  const [changeFor, setChangeFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(restaurant?.deliveryFee || 0)
  const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null)
  const [saveAddress, setSaveAddress] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', cep: '',
    street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (appUser) {
      setForm(f => ({ ...f, name: appUser.name || f.name, phone: appUser.phone || f.phone }))
      if (appUser.savedAddresses?.length > 0) {
        const last = appUser.savedAddresses[appUser.savedAddresses.length - 1]
        setForm(f => ({ ...f, cep: last.cep || '', street: last.street || '', number: last.number || '',
          complement: last.complement || '', neighborhood: last.neighborhood || '', city: last.city || '', state: last.state || '' }))
      }
    }
  }, [appUser])

  useEffect(() => {
    if (!restaurant || orderType !== 'delivery') return
    const { fee, zoneName } = calculateDeliveryFee(
      { cep: form.cep, neighborhood: form.neighborhood },
      restaurant.deliveryZones || [],
      restaurant.deliveryFee || 0
    )
    setDeliveryFee(fee)
    setDeliveryZoneName(zoneName)
  }, [form.cep, form.neighborhood, restaurant, orderType])

  const handleCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    const data = await lookupCep(clean)
    if (data) {
      setForm(f => ({ ...f, street: data.logradouro || f.street, neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city, state: data.uf || f.state }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const freeDeliveryAbove = restaurant?.freeDeliveryAbove
  const effectiveDeliveryFee = (freeDeliveryAbove && total >= freeDeliveryAbove) ? 0 : deliveryFee

  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Math.round(total * appliedCoupon.value) / 100
      : Math.min(appliedCoupon.value, total)
    : 0
  const finalTotal = total - couponDiscount + (orderType === 'delivery' ? effectiveDeliveryFee : 0)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const coupon = await getCouponByCode(couponCode, restaurantId)
      if (!coupon) { toast.error('Cupom não encontrado'); return }
      if (!coupon.active) { toast.error('Cupom inativo'); return }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { toast.error('Cupom expirado'); return }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) { toast.error('Cupom esgotado'); return }
      if (coupon.minOrderValue && total < coupon.minOrderValue) {
        toast.error(`Pedido mínimo para este cupom: ${formatCurrency(coupon.minOrderValue)}`); return
      }
      setAppliedCoupon(coupon)
      toast.success('Cupom aplicado!')
    } catch {
      toast.error('Erro ao validar cupom')
    } finally {
      setCouponLoading(false)
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (orderType === 'delivery') {
      if (!form.cep.trim() || form.cep.replace(/\D/g, '').length < 8) e.cep = 'CEP inválido'
      if (!form.street.trim()) e.street = 'Rua obrigatória'
      if (!form.number.trim()) e.number = 'Número obrigatório'
      if (!form.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório'
      if (!form.city.trim()) e.city = 'Cidade obrigatória'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const [orderNumber] = await Promise.all([getNextOrderNumber(restaurantId)])
      const now = new Date().toISOString()

      const address: Address | undefined = orderType === 'delivery' ? {
        cep: form.cep, street: form.street, number: form.number, complement: form.complement,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
      } : undefined

      const orderId = await createOrder({
        orderNumber, restaurantId,
        items: items.map(i => ({
          productId: i.product.id, productName: i.product.name,
          productPrice: i.product.price, quantity: i.quantity,
          observations: i.observations, subtotal: i.product.price * i.quantity,
        })),
        subtotal: total,
        deliveryFee: orderType === 'delivery' ? effectiveDeliveryFee : 0,
        total: finalTotal, status: 'pending', type: orderType, paymentMethod,
        customerUid: user?.uid, customerName: form.name, customerPhone: form.phone,
        ...(address && { address }),
        ...(paymentMethod === 'cash' && needsChange && changeFor
          ? { needsChange: true, changeFor: parseFloat(changeFor) } : {}),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code, couponDiscount } : {}),
        createdAt: now, updatedAt: now,
      })

      if (appliedCoupon) {
        incrementCouponUsage(appliedCoupon.id).catch(() => {})
      }

      if (user && appUser) {
        const updates: any = { name: form.name, phone: form.phone }
        if (address && saveAddress) {
          const existing = appUser.savedAddresses || []
          const filtered = existing.filter(a => a.cep !== address.cep || a.number !== address.number)
          updates.savedAddresses = [...filtered, address].slice(-5)
        }
        await setAppUser(user.uid, updates)
        await refreshAppUser()
      }

      fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, orderId, orderNumber, customerName: form.name,
          items, total: finalTotal, type: orderType, paymentMethod,
          address: orderType === 'delivery' ? form : undefined }),
      }).catch(() => {})

      clearCart()
      router.push(`/r/${slug}/order/${orderId}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao realizar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) { router.push(`/r/${slug}`); return null }

  const minOrder = restaurant?.minOrderValue
  const belowMin = minOrder && total < minOrder

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Finalizar Pedido</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-800 text-sm">Entre para salvar seu endereço</p>
              <p className="text-xs text-blue-600 mt-0.5">Preencha seus dados mais rápido na próxima vez</p>
            </div>
            <button onClick={() => setAuthModal(true)} className="flex items-center gap-1 text-sm font-semibold text-blue-600">
              Entrar <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Como deseja receber?</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'delivery', label: '🛵 Entrega', desc: restaurant ? `~${restaurant.estimatedDeliveryTime} min` : '' },
              { value: 'pickup', label: '🏪 Retirada', desc: restaurant ? `~${restaurant.estimatedPickupTime} min` : '' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setOrderType(opt.value as OrderType)}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition ${orderType === opt.value ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500'}`}>
                <span className="text-lg">{opt.label}</span>
                {opt.desc && <span className="text-xs opacity-70">{opt.desc}</span>}
              </button>
            ))}
          </div>
          {belowMin && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mt-3">
              ⚠️ Pedido mínimo: {formatCurrency(minOrder!)}. Faltam {formatCurrency(minOrder! - total)}.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">Seus dados</h2>
          <Input label="Nome completo" placeholder="João Silva" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name}
            icon={<User size={15} />} />
          <Input label="Telefone / WhatsApp" placeholder="(11) 99999-9999" type="tel"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            error={errors.phone} icon={<Phone size={15} />} />
        </div>

        {orderType === 'delivery' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-semibold text-gray-800">Endereço de entrega</h2>
            {appUser?.savedAddresses && appUser.savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Endereços salvos</p>
                {appUser.savedAddresses.slice(-3).reverse().map((addr, i) => (
                  <button key={i} onClick={() => setForm(f => ({ ...f, ...addr }))}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-red-50 hover:border-red-300 border border-gray-200 transition text-sm">
                    <span className="font-medium text-gray-700">{addr.street}, {addr.number}</span>
                    <span className="text-gray-400 ml-1">— {addr.neighborhood}, {addr.city}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Input label="CEP" placeholder="00000-000" value={form.cep}
                onChange={e => setForm(f => ({ ...f, cep: formatCep(e.target.value) }))}
                onBlur={handleCepBlur} error={errors.cep} icon={<MapPin size={15} />} maxLength={9} />
              {cepLoading && (
                <div className="absolute right-3 top-8 w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
              )}
            </div>
            {deliveryZoneName && (
              <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
                ✅ Zona: {deliveryZoneName} · Frete: {effectiveDeliveryFee === 0 ? 'Grátis' : formatCurrency(effectiveDeliveryFee)}
              </p>
            )}
            <Input label="Rua / Avenida" placeholder="Rua das Flores" value={form.street}
              onChange={e => setForm(f => ({ ...f, street: e.target.value }))} error={errors.street} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Número" placeholder="123" value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))} error={errors.number} />
              <Input label="Complemento" placeholder="Apto 4" value={form.complement}
                onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} />
            </div>
            <Input label="Bairro" placeholder="Centro" value={form.neighborhood}
              onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} error={errors.neighborhood} />
            <div className="grid grid-cols-[1fr_72px] gap-3">
              <Input label="Cidade" placeholder="São Paulo" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} error={errors.city} />
              <Input label="UF" placeholder="SP" value={form.state} maxLength={2}
                onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="save" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)}
                  className="w-4 h-4 accent-red-500" />
                <label htmlFor="save" className="text-sm text-gray-600">Salvar endereço para próximas compras</label>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">Forma de pagamento</h2>
          <div className="space-y-2">
            {[
              { value: 'pix', label: 'PIX', icon: <Smartphone size={20} />, desc: 'Pagamento instantâneo' },
              { value: 'card', label: 'Cartão', icon: <CreditCard size={20} />, desc: 'Débito ou crédito na entrega' },
              { value: 'cash', label: 'Dinheiro', icon: <DollarSign size={20} />, desc: 'Pagar na entrega' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPaymentMethod(opt.value as PaymentMethod)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${paymentMethod === opt.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={paymentMethod === opt.value ? 'text-red-500' : 'text-gray-400'}>{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === opt.value ? 'border-red-500' : 'border-gray-300'}`}>
                  {paymentMethod === opt.value && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>
          {paymentMethod === 'cash' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800">Precisa de troco?</span>
                <button onClick={() => setNeedsChange(!needsChange)}
                  className={`relative w-11 h-6 rounded-full transition ${needsChange ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${needsChange ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {needsChange && (
                <Input placeholder="Troco para R$ (ex: 100)" type="number" value={changeFor}
                  onChange={e => setChangeFor(e.target.value)} />
              )}
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Cupom de desconto</h2>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="font-mono font-bold text-green-700">{appliedCoupon.code}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {appliedCoupon.type === 'percent'
                    ? `${appliedCoupon.value}% de desconto`
                    : `${formatCurrency(appliedCoupon.value)} de desconto`}
                  {' '}— você economizou {formatCurrency(couponDiscount)}
                </p>
              </div>
              <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }}
                className="text-xs text-red-500 font-semibold hover:text-red-700">
                Remover
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                placeholder="CÓDIGO DO CUPOM"
                maxLength={20}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              >
                {couponLoading ? '...' : 'Aplicar'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Resumo do pedido</h2>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(total)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Desconto ({appliedCoupon.code})</span>
                <span>− {formatCurrency(couponDiscount)}</span>
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete</span>
                <span className={effectiveDeliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                  {effectiveDeliveryFee === 0 ? '🎉 Grátis' : formatCurrency(effectiveDeliveryFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-1">
              <span>Total</span>
              <span className="text-red-500">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={handleSubmit} loading={loading} disabled={!!belowMin}>
          {belowMin ? `Pedido mínimo: ${formatCurrency(minOrder!)}` : 'Confirmar Pedido'}
        </Button>
      </div>

      <AuthModal open={authModal} onClose={() => setAuthModal(false)} />
    </div>
  )
}
