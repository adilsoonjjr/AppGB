'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Store, CreditCard, Smartphone,
  DollarSign, User, Phone, ChevronRight, Utensils,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/utils'
import { createOrder, getRestaurant, setAppUser, getNextOrderNumber, getCouponByCode, incrementCouponUsage } from '@/lib/db'
import { lookupCep, calculateDeliveryFee, formatCep } from '@/lib/delivery'
import type { OrderType, PaymentMethod, Restaurant, Address } from '@/types'
import { ORDER_TYPE_LABELS } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthModal from '@/components/customer/AuthModal'
import toast from 'react-hot-toast'

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { user, appUser, refreshAppUser } = useAuth()
  const router = useRouter()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [needsChange, setNeedsChange] = useState(false)
  const [changeFor, setChangeFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null)
  const [saveAddress, setSaveAddress] = useState(true)
  const [tableNumber, setTableNumber] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponId, setCouponId] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
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
        setForm(f => ({
          ...f,
          cep: last.cep || '', street: last.street || '', number: last.number || '',
          complement: last.complement || '', neighborhood: last.neighborhood || '',
          city: last.city || '', state: last.state || '',
        }))
      }
    }
  }, [appUser])

  useEffect(() => {
    getRestaurant(RESTAURANT_ID).then(r => {
      if (r) {
        setRestaurant(r)
        setDeliveryFee(r.deliveryFee || 0)
      }
    })
  }, [])

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const coupon = await getCouponByCode(couponCode, RESTAURANT_ID)
      if (!coupon || !coupon.active) { toast.error('Cupom inválido ou expirado'); return }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { toast.error('Cupom expirado'); return }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) { toast.error('Cupom esgotado'); return }
      if (coupon.minOrderValue && total < coupon.minOrderValue) {
        toast.error(`Pedido mínimo de ${formatCurrency(coupon.minOrderValue)} para este cupom`); return
      }
      const discount = coupon.type === 'percent' ? total * (coupon.value / 100) : coupon.value
      setCouponDiscount(Math.min(discount, total))
      setCouponId(coupon.id)
      setCouponApplied(true)
      toast.success(`Cupom aplicado! Desconto de ${formatCurrency(Math.min(discount, total))}`)
    } catch {
      toast.error('Erro ao validar cupom')
    } finally {
      setCouponLoading(false)
    }
  }

  const freeDeliveryAbove = restaurant?.freeDeliveryAbove
  const effectiveDeliveryFee = (freeDeliveryAbove && total >= freeDeliveryAbove) ? 0 : deliveryFee
  const finalTotal = total + (orderType === 'delivery' ? effectiveDeliveryFee : 0) - couponDiscount

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
      const [orderNumber, now] = await Promise.all([
        getNextOrderNumber(RESTAURANT_ID),
        Promise.resolve(new Date().toISOString()),
      ])

      const address: Address | undefined = orderType === 'delivery' ? {
        cep: form.cep, street: form.street, number: form.number,
        complement: form.complement, neighborhood: form.neighborhood,
        city: form.city, state: form.state,
      } : undefined

      const orderId = await createOrder({
        orderNumber,
        restaurantId: RESTAURANT_ID,
        items: items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          productPrice: i.product.isPromotion && i.product.promotionalPrice ? i.product.promotionalPrice : i.product.price,
          quantity: i.quantity,
          observations: i.observations,
          subtotal: (i.product.isPromotion && i.product.promotionalPrice ? i.product.promotionalPrice : i.product.price) * i.quantity,
        })),
        subtotal: total,
        deliveryFee: orderType === 'delivery' ? effectiveDeliveryFee : 0,
        total: finalTotal,
        status: 'pending',
        type: orderType,
        paymentMethod,
        customerUid: user?.uid,
        customerName: form.name,
        customerPhone: form.phone,
        ...(address && { address }),
        ...(orderType === 'dine_in' && tableNumber && { tableNumber }),
        ...(paymentMethod === 'cash' && needsChange && changeFor
          ? { needsChange: true, changeFor: parseFloat(changeFor) }
          : {}),
        ...(couponApplied && { couponCode: couponCode.toUpperCase(), couponDiscount }),
        createdAt: now,
        updatedAt: now,
      })

      if (couponApplied && couponId) {
        incrementCouponUsage(couponId).catch(() => {})
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
        body: JSON.stringify({
          restaurantId: RESTAURANT_ID, orderId, orderNumber, customerName: form.name,
          items, total: finalTotal, type: orderType, paymentMethod,
          address: orderType === 'delivery' ? form : undefined,
          tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        }),
      }).catch(() => {})

      clearCart()
      router.push(`/order/${orderId}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao realizar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) { router.push('/menu'); return null }

  const minOrder = restaurant?.minOrderValue
  const belowMin = minOrder && total < minOrder

  const orderOptions = [
    { value: 'delivery', label: '🛵 Entrega', desc: restaurant ? `~${restaurant.estimatedDeliveryTime} min` : '', enabled: restaurant?.deliveryEnabled !== false },
    { value: 'pickup', label: '🏪 Retirada', desc: restaurant ? `~${restaurant.estimatedPickupTime} min` : '', enabled: true },
    { value: 'dine_in', label: '🍽️ No Local', desc: 'Consumir aqui', enabled: restaurant?.dineInEnabled !== false },
  ].filter(o => o.enabled)

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
            <button onClick={() => setAuthModal(true)}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Entrar <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Tipo de pedido */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Como deseja?</h2>
          <div className={`grid gap-2 ${orderOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {orderOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setOrderType(opt.value as OrderType)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${
                  orderType === opt.value
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{opt.label}</span>
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

        {/* Mesa (dine_in) */}
        {orderType === 'dine_in' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Utensils size={18} className="text-amber-600" />
              Número da Mesa
            </h2>
            <input
              type="text"
              placeholder="Ex: Mesa 5, Balcão, Área externa..."
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}

        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">Seus dados</h2>
          <Input label="Nome completo" placeholder="João Silva" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name}
            icon={<User size={15} />} />
          <Input label="Telefone / WhatsApp" placeholder="(71) 99999-9999" type="tel"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            error={errors.phone} icon={<Phone size={15} />} />
        </div>

        {/* Endereço de entrega */}
        {orderType === 'delivery' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-semibold text-gray-800">Endereço de entrega</h2>

            {appUser?.savedAddresses && appUser.savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Endereços salvos</p>
                {appUser.savedAddresses.slice(-3).reverse().map((addr, i) => (
                  <button key={i} onClick={() => setForm(f => ({ ...f, ...addr }))}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-amber-50 hover:border-amber-300 border border-gray-200 transition text-sm">
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
                <div className="absolute right-3 top-8 w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
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
            <Input label="Referência" placeholder="Próximo à padaria..." value={form.complement}
              onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label="Cidade" placeholder="Salvador" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} error={errors.city} />
              </div>
              <Input label="UF" placeholder="BA" value={form.state} maxLength={2}
                onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="save" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)}
                  className="w-4 h-4 accent-amber-500" />
                <label htmlFor="save" className="text-sm text-gray-600">Salvar endereço</label>
              </div>
            )}
          </div>
        )}

        {/* Cupom de desconto */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Cupom de desconto</h2>
          {couponApplied ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-green-700 font-semibold text-sm">
                🎉 {couponCode.toUpperCase()} — {formatCurrency(couponDiscount)} de desconto
              </span>
              <button onClick={() => { setCouponApplied(false); setCouponDiscount(0); setCouponCode('') }}
                className="text-xs text-red-500 hover:text-red-700">Remover</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text" placeholder="GALPAO10" value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              />
              <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50">
                {couponLoading ? '...' : 'Aplicar'}
              </button>
            </div>
          )}
        </div>

        {/* Pagamento */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">Forma de pagamento</h2>
          <div className="space-y-2">
            {[
              { value: 'pix', label: 'PIX', icon: <Smartphone size={20} />, desc: 'Pagamento instantâneo' },
              { value: 'card', label: 'Cartão', icon: <CreditCard size={20} />, desc: 'Débito ou crédito na entrega' },
              { value: 'cash', label: 'Dinheiro', icon: <DollarSign size={20} />, desc: 'Pagar na entrega' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPaymentMethod(opt.value as PaymentMethod)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${
                  paymentMethod === opt.value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <span className={paymentMethod === opt.value ? 'text-amber-600' : 'text-gray-400'}>{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === opt.value ? 'border-amber-500' : 'border-gray-300'}`}>
                  {paymentMethod === opt.value && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800">Precisa de troco?</span>
                <button onClick={() => setNeedsChange(!needsChange)}
                  className={`relative w-11 h-6 rounded-full transition ${needsChange ? 'bg-amber-500' : 'bg-gray-300'}`}>
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

        {/* Resumo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Resumo do pedido</h2>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                <span className="font-medium">{formatCurrency((item.product.isPromotion && item.product.promotionalPrice ? item.product.promotionalPrice : item.product.price) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(total)}</span>
            </div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete</span>
                <span className={effectiveDeliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                  {effectiveDeliveryFee === 0 ? '🎉 Grátis' : formatCurrency(effectiveDeliveryFee)}
                </span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Cupom ({couponCode})</span>
                <span>- {formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-1">
              <span>Total</span>
              <span className="text-amber-600">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        <Button
          size="lg" className="w-full !bg-amber-500 hover:!bg-amber-600" onClick={handleSubmit} loading={loading}
          disabled={!!belowMin}
        >
          {belowMin ? `Pedido mínimo: ${formatCurrency(minOrder!)}` : 'Confirmar Pedido 🍽️'}
        </Button>
      </div>

      <AuthModal open={authModal} onClose={() => setAuthModal(false)} />
    </div>
  )
}
