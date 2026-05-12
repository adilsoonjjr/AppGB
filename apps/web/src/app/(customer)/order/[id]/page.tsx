'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, Clock, ChefHat, Truck, Star, Home, QrCode, MessageCircle, Utensils } from 'lucide-react'
import { subscribeToOrder, rateOrder } from '@/lib/db'
import type { Order, OrderStatus } from '@/types'
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PixModal from '@/components/customer/PixModal'
import toast from 'react-hot-toast'

const deliverySteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'pending', icon: <CheckCircle size={20} />, label: 'Recebido' },
  { status: 'preparing', icon: <ChefHat size={20} />, label: 'Em Preparo' },
  { status: 'delivering', icon: <Truck size={20} />, label: 'Saiu' },
  { status: 'delivered', icon: <Star size={20} />, label: 'Entregue' },
]

const pickupSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'pending', icon: <CheckCircle size={20} />, label: 'Recebido' },
  { status: 'preparing', icon: <ChefHat size={20} />, label: 'Em Preparo' },
  { status: 'ready', icon: <Star size={20} />, label: 'Pronto' },
  { status: 'delivered', icon: <CheckCircle size={20} />, label: 'Retirado' },
]

const dineInSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'pending', icon: <CheckCircle size={20} />, label: 'Recebido' },
  { status: 'preparing', icon: <ChefHat size={20} />, label: 'Em Preparo' },
  { status: 'ready', icon: <Utensils size={20} />, label: 'Pronto' },
  { status: 'delivered', icon: <Star size={20} />, label: 'Servido' },
]

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered']

function getStepIndex(status: OrderStatus): number {
  return statusOrder.indexOf(status)
}

const statusMessages: Partial<Record<OrderStatus, string>> = {
  pending: 'Aguardando confirmação do restaurante...',
  confirmed: 'Pedido confirmado! Preparando em breve.',
  preparing: 'Seu pedido está sendo preparado com carinho 🍳',
  ready: 'Pedido pronto! Já vai sair.',
  delivering: 'Seu pedido está a caminho! 🛵',
  delivered: 'Pedido entregue! Bom apetite! 🎉',
  cancelled: 'Infelizmente o pedido foi cancelado.',
}

function RatingModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (score === 0) { toast.error('Selecione uma avaliação'); return }
    setLoading(true)
    try {
      await rateOrder(orderId, { score, comment: comment.trim() || undefined, createdAt: new Date().toISOString() })
      toast.success('Avaliação enviada! Obrigado 😊')
      onClose()
    } catch {
      toast.error('Erro ao enviar avaliação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Avalie seu pedido</h2>
        <p className="text-sm text-gray-400 text-center mb-6">Sua opinião é muito importante para nós!</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setScore(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={`transition-colors ${(hover || score) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>

        <textarea
          placeholder="Deixe um comentário (opcional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
        />

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Depois
          </button>
          <button onClick={handleSubmit} disabled={loading || score === 0}
            className="py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [pixOpen, setPixOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingShown, setRatingShown] = useState(false)

  useEffect(() => {
    const unsub = subscribeToOrder(id, o => {
      setOrder(o)
      setLoading(false)
    })
    return unsub
  }, [id])

  useEffect(() => {
    if (order?.status === 'delivered' && !order.rating && !ratingShown) {
      const t = setTimeout(() => { setRatingOpen(true); setRatingShown(true) }, 1500)
      return () => clearTimeout(t)
    }
  }, [order?.status, order?.rating, ratingShown])

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Pedido não encontrado</p>
        <Button onClick={() => router.push('/menu')}>Voltar ao Cardápio</Button>
      </div>
    )
  }

  const steps = order.type === 'pickup' ? pickupSteps : order.type === 'dine_in' ? dineInSteps : deliverySteps
  const currentIdx = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white px-4 pt-8 pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-amber-100 text-sm">Pedido #{order.orderNumber}</p>
          <h1 className="text-2xl font-bold mt-1">Acompanhe seu pedido</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-amber-100 text-sm">{formatDate(order.createdAt)}</p>
            <span className="text-amber-300">·</span>
            <p className="text-amber-100 text-sm">
              {ORDER_TYPE_LABELS[order.type]}
              {order.type === 'dine_in' && order.tableNumber && ` — ${order.tableNumber}`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {isCancelled ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-lg font-bold text-red-600">Pedido Cancelado</h2>
              <p className="text-gray-500 text-sm mt-1">Entre em contato com o restaurante</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">{statusMessages[order.status]}</p>
                {order.estimatedTime && !isDelivered && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium mt-2">
                    <Clock size={14} />
                    <span>~{order.estimatedTime} min</span>
                  </div>
                )}
              </div>

              {/* Progress Steps */}
              <div className="relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
                <div
                  className="absolute top-5 left-5 h-0.5 bg-amber-500 transition-all duration-1000"
                  style={{ width: `${(currentIdx / (steps.length - 1)) * (100 - (10 / steps.length))}%` }}
                />
                <div className="relative flex justify-between">
                  {steps.map((step) => {
                    const stepIdx = getStepIndex(step.status)
                    const isActive = currentIdx >= stepIdx
                    const isCurrent = currentIdx === stepIdx
                    return (
                      <div key={step.status} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                          isActive ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-amber-200' : ''}`}>
                          {step.icon}
                        </div>
                        <p className={`text-xs font-medium text-center max-w-16 leading-tight ${isActive ? 'text-amber-600' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rating section */}
        {isDelivered && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {order.rating ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 mb-2">Sua avaliação</p>
                <div className="flex justify-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={20} className={s <= order.rating!.score ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  ))}
                </div>
                {order.rating.comment && <p className="text-xs text-gray-500 italic">"{order.rating.comment}"</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Gostou do pedido?</p>
                  <p className="text-xs text-gray-400">Avalie sua experiência</p>
                </div>
                <button onClick={() => setRatingOpen(true)}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                  <Star size={14} />
                  Avaliar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Detalhes do pedido</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.productName}
                  {item.observations && <span className="text-gray-400 italic ml-1">({item.observations})</span>}
                </span>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            {order.couponDiscount && order.couponDiscount > 0 ? (
              <>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupom ({order.couponCode})</span>
                  <span>- {formatCurrency(order.couponDiscount)}</span>
                </div>
              </>
            ) : null}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>Frete</span><span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-amber-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        {order.type === 'delivery' && order.address && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-2">Endereço de entrega</h2>
            <p className="text-sm text-gray-600">
              {order.address.street}, {order.address.number}
              {order.address.complement && `, ${order.address.complement}`}
              {' - '}{order.address.neighborhood}, {order.address.city}
            </p>
          </div>
        )}

        {order.type === 'dine_in' && order.tableNumber && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">📍 {order.tableNumber}</p>
          </div>
        )}

        {order.paymentMethod === 'pix' && !isDelivered && !isCancelled && (
          <button onClick={() => setPixOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold transition">
            <QrCode size={18} />
            Ver QR Code PIX — {formatCurrency(order.total)}
          </button>
        )}

        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=Olá! Tenho uma dúvida sobre meu pedido %23${order.orderNumber}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20b858] text-white font-semibold transition"
          >
            <MessageCircle size={18} />
            Falar com o Restaurante
          </a>
        )}

        <Button variant="secondary" size="lg" className="w-full" onClick={() => router.push('/menu')}>
          <Home size={18} />
          Voltar ao Cardápio
        </Button>
      </div>

      <PixModal open={pixOpen} onClose={() => setPixOpen(false)}
        orderId={order.id} amount={order.total} restaurantId={order.restaurantId} />

      {ratingOpen && <RatingModal orderId={order.id} onClose={() => setRatingOpen(false)} />}
    </div>
  )
}
